/**
 * Shopify OAuth Callback Handler
 * Handles the OAuth callback from Shopify and exchanges code for tokens
 */

import { setAuthCookie, getTempCookie, clearAuthCookie } from '../utils/cookies.js';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { code, state, error } = req.query;

    // Handle OAuth errors
    if (error) {
      console.error('OAuth error:', error);
      
      // Check if redirect mode (check sessionStorage or URL)
      const isRedirectMode = req.query.redirect_mode === 'true';
      
      if (isRedirectMode) {
        // Redirect mode - redirect back with error
        const redirectUrl = new URL(process.env.VITE_APP_URL || 'http://localhost:8080');
        redirectUrl.searchParams.set('oauth_error', 'true');
        redirectUrl.searchParams.set('error_message', encodeURIComponent(error));
        return res.redirect(redirectUrl.toString());
      }
      
      // Popup mode - return error page
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Error</title>
        </head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'OAUTH_ERROR',
                error: '${error}'
              }, '${process.env.VITE_APP_URL || 'http://localhost:8080'}');
              window.close();
            } else {
              // Fallback if popup was blocked - redirect with error
              window.location.href = '${process.env.VITE_APP_URL || 'http://localhost:8080'}?oauth_error=true&error_message=' + encodeURIComponent('${error}');
            }
          </script>
        </body>
        </html>
      `);
    }

    // Validate required parameters
    if (!code || !state) {
      const isRedirectMode = req.query.redirect_mode === 'true';
      
      if (isRedirectMode) {
        // Redirect mode - redirect back with error
        const redirectUrl = new URL(process.env.VITE_APP_URL || 'http://localhost:8080');
        redirectUrl.searchParams.set('oauth_error', 'true');
        redirectUrl.searchParams.set('error_message', encodeURIComponent('Missing required parameters'));
        return res.redirect(redirectUrl.toString());
      }
      
      // Popup mode - return error page
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Error</title>
        </head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'OAUTH_ERROR',
                error: 'Missing required parameters'
              }, '${process.env.VITE_APP_URL || 'http://localhost:8080'}');
              window.close();
            } else {
              // Fallback if popup was blocked - redirect with error
              window.location.href = '${process.env.VITE_APP_URL || 'http://localhost:8080'}?oauth_error=true&error_message=' + encodeURIComponent('Missing required parameters');
            }
          </script>
        </body>
        </html>
      `);
    }

    // Get state and code_verifier from sessionStorage via JavaScript
    // We'll read them in the HTML page and pass them to the server
    const storedState = req.query.stored_state;
    const codeVerifier = req.query.code_verifier;
    const redirectMode = req.query.redirect_mode; // May come from URL or sessionStorage

    if (!storedState || !codeVerifier) {
      console.error('Missing stored_state or code_verifier - will read from sessionStorage');
      // Return HTML that reads from sessionStorage and makes another request
      return res.status(200).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Processing Authentication...</title>
        </head>
        <body>
          <script>
            // Read from sessionStorage
            const storedState = sessionStorage.getItem('oauth_state');
            const codeVerifier = sessionStorage.getItem('oauth_code_verifier');
            
            if (!storedState || !codeVerifier) {
              console.error('Missing oauth parameters in sessionStorage');
              if (window.opener) {
                window.opener.postMessage({
                  type: 'OAUTH_ERROR',
                  error: 'Missing authentication session. Please try again.'
                }, '${process.env.VITE_APP_URL || 'https://www.fairybloom.cz'}');
                window.close();
              }
            } else {
              // Check if redirect mode is set in sessionStorage
              const redirectMode = sessionStorage.getItem('oauth_redirect_mode');
              
              // Make request to callback with parameters
              const url = new URL(window.location);
              url.searchParams.set('stored_state', storedState);
              url.searchParams.set('code_verifier', codeVerifier);
              if (redirectMode === 'true') {
                url.searchParams.set('redirect_mode', 'true');
              }
              window.location.href = url.toString();
            }
          </script>
        </body>
        </html>
      `);
    }

    // Verify state parameter (CSRF protection)
    if (storedState !== state) {
      console.error('Invalid state parameter', { storedState, state });
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Error</title>
        </head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'OAUTH_ERROR',
                error: 'Invalid state parameter - CSRF check failed'
              }, '${process.env.VITE_APP_URL || 'https://www.fairybloom.cz'}');
              window.close();
            }
          </script>
        </body>
        </html>
      `);
    }

    // Get environment variables
    const clientId = process.env.SHOPIFY_OAUTH_CLIENT_ID;
    const shopId = process.env.SHOPIFY_SHOP_ID;
    const redirectUri = `${process.env.VITE_APP_URL || 'http://localhost:8080'}/api/auth/callback`;

    if (!clientId || !shopId) {
      console.error('Missing required environment variables');
      return res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Server Error</title>
        </head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'OAUTH_ERROR',
                error: 'Server configuration error'
              }, '${process.env.VITE_APP_URL || 'http://localhost:8080'}');
              window.close();
            }
          </script>
        </body>
        </html>
      `);
    }

    // Exchange code for tokens (Public Client - no client_secret needed)
    const tokenUrl = `https://shopify.com/${shopId}/auth/oauth/token`;
    const tokenData = {
      grant_type: 'authorization_code',
      client_id: clientId,
      code: code,
      code_verifier: codeVerifier,
      redirect_uri: redirectUri
    };

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(tokenData)
    });

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text();
      console.error('Token exchange failed:', tokenResponse.status, errorText);
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Error</title>
        </head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'OAUTH_ERROR',
                error: 'Token exchange failed'
              }, '${process.env.VITE_APP_URL || 'http://localhost:8080'}');
              window.close();
            }
          </script>
        </body>
        </html>
      `);
    }

    const tokenResult = await tokenResponse.json();
    const { access_token, expires_in, id_token } = tokenResult;

    if (!access_token) {
      console.error('No access token received');
      return res.status(400).send(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Authentication Error</title>
        </head>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({
                type: 'OAUTH_ERROR',
                error: 'No access token received'
              }, '${process.env.VITE_APP_URL || 'http://localhost:8080'}');
              window.close();
            }
          </script>
        </body>
        </html>
      `);
    }

    // Calculate expiration time
    const expiresAt = new Date(Date.now() + (expires_in * 1000)).toISOString();

    // Dekódovat id_token (JWT) pro získání zákaznických dat
    let customerData = null;
    if (id_token) {
      try {
        // JWT má 3 části: header.payload.signature
        const payloadBase64 = id_token.split('.')[1];
        const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf-8');
        const payload = JSON.parse(payloadJson);
        
        // Extrahovat zákaznická data z JWT
        customerData = {
          email: payload.email,
          firstName: payload.given_name || '',
          lastName: payload.family_name || '',
          sub: payload.sub // Shopify customer ID
        };
        
        console.log('Decoded customer data from JWT:', customerData);
      } catch (error) {
        console.error('Failed to decode id_token:', error);
      }
    }

    // Set secure HTTP-only cookie with customer data
    // CRITICAL: Cookie must be set BEFORE sending response to popup
    setAuthCookie(res, access_token, expiresAt, customerData);

    // DEBUG: Log cookie was set
    const tokenPreview = `${access_token.slice(0, 6)}...${access_token.slice(-4)}`;
    console.log('[OAuth Callback] Cookie set with token preview:', tokenPreview);
    console.log('[OAuth Callback] Cookie expires at:', expiresAt);
    console.log('[OAuth Callback] Cookie secure:', process.env.NODE_ENV === 'production');
    console.log('[OAuth Callback] Cookie domain will be set automatically by browser');

    // Clear temporary cookies - append to existing Set-Cookie header
    const existingCookies = res.getHeader('Set-Cookie');
    let cookieArray = [];
    
    // Handle Set-Cookie header (should be array after setAuthCookie)
    if (existingCookies) {
      if (Array.isArray(existingCookies)) {
        cookieArray = existingCookies;
      } else {
        cookieArray = [existingCookies];
      }
    }
    
    const clearCookies = [
      'oauth_state=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=None; Secure',
      'oauth_code_verifier=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=None; Secure'
    ];
    
    cookieArray.push(...clearCookies);
    res.setHeader('Set-Cookie', cookieArray);

    // Check if this is redirect mode (mobile) or popup mode (desktop)
    // redirect_mode can come from:
    // 1. URL query parameter (if Shopify passes it back)
    // 2. sessionStorage (read via JavaScript in the HTML page)
    // 3. We detect it by checking if window.opener exists (popup) or not (redirect)
    // For now, we'll check the query parameter and also check in the HTML page
    const isRedirectMode = req.query.redirect_mode === 'true';
    
    if (isRedirectMode) {
      // Full-page redirect mode (mobile) - redirect back to app with success flag
      // Cookie is already set, so we just need to redirect
      const redirectUrl = new URL(process.env.VITE_APP_URL || 'http://localhost:8080');
      redirectUrl.searchParams.set('oauth_success', 'true');
      redirectUrl.searchParams.set('auth_timestamp', Date.now().toString());
      
      // Store customer data in sessionStorage via redirect URL (will be read by frontend)
      if (customerData) {
        // We'll pass customer data via URL hash (not visible in server logs)
        // Frontend will read it and store in localStorage
        redirectUrl.hash = `oauth_success=true&customer=${encodeURIComponent(JSON.stringify(customerData))}`;
      }
      
      return res.redirect(redirectUrl.toString());
    }

    // Popup mode (desktop) - return HTML that posts message to parent window
    // But first check if this is actually redirect mode (no window.opener)
    // NOTE: Cookie is set in popup (backup), but parent window will set it again via /api/auth/set-cookie
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Successful</title>
      </head>
      <body>
        <script>
          // Check if this is redirect mode (no window.opener) or popup mode (has window.opener)
          const isRedirectMode = !window.opener || sessionStorage.getItem('oauth_redirect_mode') === 'true';
          
          if (isRedirectMode) {
            // Redirect mode - redirect back to app
            const redirectUrl = new URL('${process.env.VITE_APP_URL || 'http://localhost:8080'}');
            redirectUrl.searchParams.set('oauth_success', 'true');
            redirectUrl.searchParams.set('auth_timestamp', Date.now().toString());
            window.location.href = redirectUrl.toString();
          } else if (window.opener) {
            // Store customer data in localStorage for checkout sharing
            const customerData = ${customerData ? JSON.stringify(customerData) : 'null'};
            if (customerData) {
              localStorage.setItem('fairybloom_authenticated', 'true');
              localStorage.setItem('fairybloom_customer', JSON.stringify(customerData));
              localStorage.setItem('fairybloom_auth_timestamp', Date.now().toString());
            }
            
            // Post message to parent window with token
            // Parent window will set cookie via /api/auth/set-cookie endpoint
            window.opener.postMessage({
              type: 'OAUTH_SUCCESS',
              access_token: '${access_token}',
              expires_at: '${expiresAt}',
              id_token: '${id_token || ''}',
              customer: customerData
            }, '${process.env.VITE_APP_URL || 'http://localhost:8080'}');
            
            // Wait a bit before closing to ensure message is sent
            setTimeout(function() {
              window.close();
            }, 100);
          } else {
            // Fallback if popup was blocked
            window.location.href = '${process.env.VITE_APP_URL || 'http://localhost:8080'}';
          }
        </script>
      </body>
      </html>
    `);

  } catch (error) {
    console.error('OAuth callback error:', error);
    
    // Check if this is redirect mode
    const isRedirectMode = req.query.redirect_mode === 'true' || 
                          (typeof req.query.redirect_mode !== 'undefined' && req.query.redirect_mode !== 'false');
    
    if (isRedirectMode) {
      // Redirect mode - redirect back with error
      const redirectUrl = new URL(process.env.VITE_APP_URL || 'http://localhost:8080');
      redirectUrl.searchParams.set('oauth_error', 'true');
      redirectUrl.searchParams.set('error_message', encodeURIComponent('Internal server error'));
      return res.redirect(redirectUrl.toString());
    }
    
    // Popup mode - return error page
    return res.status(500).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Server Error</title>
      </head>
      <body>
        <script>
          if (window.opener) {
            window.opener.postMessage({
              type: 'OAUTH_ERROR',
              error: 'Internal server error'
            }, '${process.env.VITE_APP_URL || 'http://localhost:8080'}');
            window.close();
          } else {
            // Fallback if popup was blocked
            window.location.href = '${process.env.VITE_APP_URL || 'http://localhost:8080'}?oauth_error=true';
          }
        </script>
      </body>
      </html>
    `);
  }
}
