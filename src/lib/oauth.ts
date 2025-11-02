/**
 * OAuth 2.0 + PKCE flow orchestration for Shopify Customer Account API
 * Handles popup window authentication and postMessage communication
 */

import { 
  generateCodeVerifier, 
  generateCodeChallenge, 
  generateState,
  isValidCodeVerifier,
  isValidState 
} from './pkce';

// OAuth configuration
const OAUTH_CONFIG = {
  clientId: import.meta.env.VITE_SHOPIFY_OAUTH_CLIENT_ID,
  shopId: import.meta.env.VITE_SHOPIFY_SHOP_ID,
  appUrl: import.meta.env.VITE_APP_URL || 'https://www.fairybloom.cz',
  scopes: ['openid', 'email'],
  responseType: 'code',
  codeChallengeMethod: 'S256'
};

// OAuth flow state
let oauthPopup: Window | null = null;
let oauthResolve: ((result: OAuthResult) => void) | null = null;
let oauthReject: ((error: Error) => void) | null = null;

export interface OAuthResult {
  success: boolean;
  accessToken?: string;
  expiresAt?: string;
  idToken?: string;
  error?: string;
}

export interface OAuthError extends Error {
  type: 'OAUTH_ERROR' | 'POPUP_BLOCKED' | 'TIMEOUT' | 'NETWORK_ERROR';
}

/**
 * Initiate OAuth flow with PKCE
 * @returns {Promise<OAuthResult>} OAuth result
 */
export async function initiateOAuthFlow(): Promise<OAuthResult> {
  return new Promise(async (resolve, reject) => {
    try {
      // Validate configuration
      if (!OAUTH_CONFIG.clientId || !OAUTH_CONFIG.shopId) {
        throw new OAuthError('Missing OAuth configuration', 'OAUTH_ERROR');
      }

      // Generate PKCE parameters
      const codeVerifier = generateCodeVerifier();
      const codeChallenge = await generateCodeChallenge(codeVerifier);
      const state = generateState();

      // Validate generated parameters
      if (!isValidCodeVerifier(codeVerifier) || !isValidState(state)) {
        throw new OAuthError('Failed to generate valid PKCE parameters', 'OAUTH_ERROR');
      }

      // Store parameters in sessionStorage (will be accessible in popup)
      sessionStorage.setItem('oauth_code_verifier', codeVerifier);
      sessionStorage.setItem('oauth_state', state);

      // Build authorization URL
      const authUrl = buildAuthorizationUrl(codeChallenge, state);

      // Open popup window
      oauthPopup = window.open(
        authUrl,
        'shopify-oauth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      if (!oauthPopup) {
        throw new OAuthError('Popup was blocked by browser', 'POPUP_BLOCKED');
      }

      // Set up promise handlers
      oauthResolve = resolve;
      oauthReject = reject;

      // Set up message listener
      const messageHandler = (event: MessageEvent) => {
        handleOAuthCallback(event, resolve, reject);
      };

      window.addEventListener('message', messageHandler);

      // Set up popup monitoring
      const popupMonitor = setInterval(() => {
        if (oauthPopup?.closed) {
          clearInterval(popupMonitor);
          window.removeEventListener('message', messageHandler);
          
          if (oauthResolve === resolve) {
            reject(new OAuthError('Authentication cancelled by user', 'OAUTH_ERROR'));
          }
        }
      }, 1000);

      // Set timeout for the entire flow
      setTimeout(() => {
        if (oauthResolve === resolve) {
          clearInterval(popupMonitor);
          window.removeEventListener('message', messageHandler);
          
          if (oauthPopup && !oauthPopup.closed) {
            oauthPopup.close();
          }
          
          reject(new OAuthError('Authentication timeout', 'TIMEOUT'));
        }
      }, 5 * 60 * 1000); // 5 minutes timeout

    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Build Shopify OAuth authorization URL
 * @param {string} codeChallenge - PKCE code challenge
 * @param {string} state - CSRF state parameter
 * @returns {string} Complete authorization URL
 */
function buildAuthorizationUrl(codeChallenge: string, state: string): string {
  const params = new URLSearchParams({
    client_id: OAUTH_CONFIG.clientId,
    scope: OAUTH_CONFIG.scopes.join(' '),
    response_type: OAUTH_CONFIG.responseType,
    redirect_uri: `${OAUTH_CONFIG.appUrl}/api/auth/callback`,
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: OAUTH_CONFIG.codeChallengeMethod
  });

  return `https://shopify.com/${OAUTH_CONFIG.shopId}/auth/oauth/authorize?${params.toString()}`;
}

/**
 * Handle OAuth callback message from popup
 * @param {MessageEvent} event - PostMessage event
 * @param {Function} resolve - Promise resolve function
 * @param {Function} reject - Promise reject function
 */
async function handleOAuthCallback(
  event: MessageEvent, 
  resolve: (result: OAuthResult) => void, 
  reject: (error: Error) => void
): Promise<void> {
  // Verify origin
  const expectedOrigin = OAUTH_CONFIG.appUrl;
  if (event.origin !== expectedOrigin) {
    console.warn('OAuth callback from unexpected origin:', event.origin);
    return;
  }

  // Check if this is our OAuth message
  if (!event.data || typeof event.data !== 'object') {
    return;
  }

  const { type, access_token, expires_at, id_token, error } = event.data;

  if (type === 'OAUTH_SUCCESS') {
    // Clean up
    cleanupOAuthFlow();
    
    // Clear stored parameters
    sessionStorage.removeItem('oauth_code_verifier');
    sessionStorage.removeItem('oauth_state');
    // Also clear old sessionStorage tokens - we use cookies only now
    sessionStorage.removeItem('shopify_access_token');
    sessionStorage.removeItem('shopify_token_expires');

    // CRITICAL FIX: Set cookie in parent window via API endpoint
    // Cookie set in popup window doesn't transfer to parent window!
    if (access_token && expires_at) {
      try {
        console.log('[OAuth] Setting cookie in parent window via /api/auth/set-cookie...');
        const setCookieResponse = await fetch('/api/auth/set-cookie', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Include cookies
          body: JSON.stringify({
            access_token: access_token,
            expires_at: expires_at,
            customer: event.data.customer || null
          }),
        });

        if (!setCookieResponse.ok) {
          const errorText = await setCookieResponse.text();
          console.error('[OAuth] Failed to set cookie in parent window:', errorText);
          // Don't fail the whole flow, but log the error
        } else {
          const setCookieData = await setCookieResponse.json();
          console.log('[OAuth] Cookie successfully set in parent window:', setCookieData);
          
          // Wait a bit for cookie to be available
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      } catch (cookieError) {
        console.error('[OAuth] Error setting cookie in parent window:', cookieError);
        // Don't fail the whole flow, but log the error
      }
    }

    resolve({
      success: true,
      accessToken: access_token,
      expiresAt: expires_at,
      idToken: id_token
    });
  } else if (type === 'OAUTH_ERROR') {
    // Clean up
    cleanupOAuthFlow();
    
    // Clear stored parameters
    sessionStorage.removeItem('oauth_code_verifier');
    sessionStorage.removeItem('oauth_state');

    reject(new OAuthError(error || 'OAuth authentication failed', 'OAUTH_ERROR'));
  }
}

/**
 * Clean up OAuth flow resources
 */
function cleanupOAuthFlow(): void {
  if (oauthPopup && !oauthPopup.closed) {
    oauthPopup.close();
  }
  oauthPopup = null;
  oauthResolve = null;
  oauthReject = null;
}

/**
 * Custom error class for OAuth errors
 */
class OAuthError extends Error {
  public type: 'OAUTH_ERROR' | 'POPUP_BLOCKED' | 'TIMEOUT' | 'NETWORK_ERROR';

  constructor(message: string, type: 'OAUTH_ERROR' | 'POPUP_BLOCKED' | 'TIMEOUT' | 'NETWORK_ERROR') {
    super(message);
    this.name = 'OAuthError';
    this.type = type;
  }
}

/**
 * Check if OAuth is properly configured
 * @returns {boolean} True if configuration is valid
 */
export function isOAuthConfigured(): boolean {
  return !!(OAUTH_CONFIG.clientId && OAUTH_CONFIG.shopId && OAUTH_CONFIG.appUrl);
}

/**
 * Get OAuth configuration (for debugging)
 * @returns {object} OAuth configuration object (without sensitive data)
 */
export function getOAuthConfig() {
  return {
    clientId: OAUTH_CONFIG.clientId ? '***' : null,
    shopId: OAUTH_CONFIG.shopId,
    appUrl: OAUTH_CONFIG.appUrl,
    scopes: OAUTH_CONFIG.scopes,
    responseType: OAUTH_CONFIG.responseType,
    codeChallengeMethod: OAUTH_CONFIG.codeChallengeMethod
  };
}
