/**
 * OAuth 2.0 + PKCE flow orchestration for Shopify Customer Account API
 * Handles popup window authentication (desktop) and full-page redirect (mobile)
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
 * Check if device is mobile
 * @returns {boolean} True if device is mobile
 */
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  
  // Check screen width (mobile breakpoint)
  if (window.innerWidth < 768) return true;
  
  // Check user agent for mobile devices
  const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
  const mobileRegex = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i;
  return mobileRegex.test(userAgent.toLowerCase());
}

/**
 * Initiate OAuth flow with PKCE
 * Uses popup on desktop, full-page redirect on mobile
 * @returns {Promise<OAuthResult>} OAuth result
 */
export async function initiateOAuthFlow(): Promise<OAuthResult> {
  // Use full-page redirect for mobile devices
  if (isMobileDevice()) {
    return initiateOAuthFlowRedirect();
  }
  
  // Use popup for desktop
  return initiateOAuthFlowPopup();
}

/**
 * OAuth flow using full-page redirect (for mobile)
 * @returns {Promise<OAuthResult>} OAuth result (never resolves - handled by redirect)
 */
async function initiateOAuthFlowRedirect(): Promise<OAuthResult> {
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

    // Store parameters in sessionStorage (will be accessible after redirect)
    sessionStorage.setItem('oauth_code_verifier', codeVerifier);
    sessionStorage.setItem('oauth_state', state);
    sessionStorage.setItem('oauth_redirect_mode', 'true'); // Flag to indicate redirect mode

    // Build authorization URL (with redirect_mode flag)
    const authUrl = buildAuthorizationUrl(codeChallenge, state, true);

    // Redirect to OAuth URL
    window.location.href = authUrl;
    
    // This promise will never resolve normally - it's handled by callback redirect
    // Return a promise that never resolves (user will be redirected)
    return new Promise(() => {
      // Promise never resolves - user is redirected
    });
  } catch (error) {
    throw error;
  }
}

/**
 * OAuth flow using popup window (for desktop)
 * Falls back to redirect if popup is blocked
 * @returns {Promise<OAuthResult>} OAuth result
 */
async function initiateOAuthFlowPopup(): Promise<OAuthResult> {
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

      // Store parameters in sessionStorage (will be accessible in popup or after redirect)
      sessionStorage.setItem('oauth_code_verifier', codeVerifier);
      sessionStorage.setItem('oauth_state', state);
      sessionStorage.removeItem('oauth_redirect_mode'); // Clear redirect flag initially

      // Build authorization URL
      const authUrl = buildAuthorizationUrl(codeChallenge, state);

      // Open popup window
      oauthPopup = window.open(
        authUrl,
        'shopify-oauth',
        'width=500,height=600,scrollbars=yes,resizable=yes'
      );

      // FALLBACK: If popup is blocked, use redirect instead
      // Check multiple conditions to detect blocked popup
      let isPopupBlocked = false;
      
      if (!oauthPopup) {
        // Most obvious case: window.open returned null
        isPopupBlocked = true;
      } else {
        // Safari sometimes returns a window object but blocks access
        try {
          // Try to access popup properties - will throw if blocked
          const isClosed = oauthPopup.closed;
          // Try to access location - will throw if blocked in Safari
          const location = oauthPopup.location;
          
          // Also check if popup is immediately closed (some browsers do this)
          if (isClosed) {
            isPopupBlocked = true;
          }
        } catch (e) {
          // Popup is blocked (access denied) - common in Safari
          isPopupBlocked = true;
        }
      }
      
      if (isPopupBlocked) {
        console.log('[OAuth] Popup blocked, falling back to redirect mode');
        sessionStorage.setItem('oauth_redirect_mode', 'true');
        return initiateOAuthFlowRedirect();
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
 * @param {boolean} isRedirectMode - Whether this is redirect mode (for mobile)
 * @returns {string} Complete authorization URL
 */
function buildAuthorizationUrl(codeChallenge: string, state: string, isRedirectMode: boolean = false): string {
  const params = new URLSearchParams({
    client_id: OAUTH_CONFIG.clientId,
    scope: OAUTH_CONFIG.scopes.join(' '),
    response_type: OAUTH_CONFIG.responseType,
    redirect_uri: `${OAUTH_CONFIG.appUrl}/api/auth/callback`,
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: OAUTH_CONFIG.codeChallengeMethod
  });

  // Add redirect_mode parameter for callback to know how to handle response
  if (isRedirectMode) {
    params.set('redirect_mode', 'true');
  }

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
        console.log('[OAuth] Setting cookie in parent window via /api/auth/session...');
        const setCookieResponse = await fetch('/api/auth/session', {
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
