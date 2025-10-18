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
            }
          </script>
        </body>
        </html>
      `);
    }

    // Validate required parameters
    if (!code || !state) {
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
            }
          </script>
        </body>
        </html>
      `);
    }

    // Get state and code_verifier from cookies
    const storedState = getTempCookie(req, 'oauth_state');
    const codeVerifier = getTempCookie(req, 'oauth_code_verifier');

    if (!storedState || !codeVerifier) {
      console.error('Missing oauth_state or oauth_code_verifier in cookies');
      console.log('Cookies:', req.headers.cookie);
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
                error: 'Missing authentication session. Please try again.'
              }, '${process.env.VITE_APP_URL || 'https://www.fairybloom.cz'}');
              window.close();
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

    // Set secure HTTP-only cookie
    setAuthCookie(res, access_token, expiresAt);

    // Clear temporary cookies
    res.setHeader('Set-Cookie', [
      ...res.getHeader('Set-Cookie') || [],
      'oauth_state=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/',
      'oauth_code_verifier=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/'
    ]);

    // Return success page that posts message to parent window
    return res.status(200).send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Authentication Successful</title>
      </head>
      <body>
        <script>
          if (window.opener) {
            window.opener.postMessage({
              type: 'OAUTH_SUCCESS',
              access_token: '${access_token}',
              expires_at: '${expiresAt}',
              id_token: '${id_token || ''}'
            }, '${process.env.VITE_APP_URL || 'http://localhost:8080'}');
            window.close();
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
          }
        </script>
      </body>
      </html>
    `);
  }
}
