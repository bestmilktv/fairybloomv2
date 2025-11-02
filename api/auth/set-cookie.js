/**
 * Endpoint for setting authentication cookie from parent window
 * This is called after OAuth callback sends token via postMessage
 * Cookie must be set in parent window, not in popup window
 */

import { setAuthCookie } from '../utils/cookies.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { access_token, expires_at, customer } = req.body;

    // Validate required fields
    if (!access_token || !expires_at) {
      return res.status(400).json({ 
        error: 'Missing required fields: access_token and expires_at are required' 
      });
    }

    // Validate expires_at is a valid ISO string or timestamp
    let expiresAt;
    try {
      expiresAt = new Date(expires_at).toISOString();
      if (expiresAt === 'Invalid Date') {
        throw new Error('Invalid date');
      }
    } catch (error) {
      return res.status(400).json({ 
        error: 'Invalid expires_at format. Must be ISO string or timestamp' 
      });
    }

    // Set cookie in parent window (this is the key fix!)
    setAuthCookie(res, access_token, expiresAt, customer || null);

    // DEBUG: Log cookie was set
    const tokenPreview = `${access_token.slice(0, 6)}...${access_token.slice(-4)}`;
    console.log('[Set Cookie API] Cookie set in parent window with token preview:', tokenPreview);
    console.log('[Set Cookie API] Cookie expires at:', expiresAt);
    console.log('[Set Cookie API] Cookie secure:', process.env.NODE_ENV === 'production');

    return res.status(200).json({ 
      success: true,
      message: 'Cookie set successfully',
      expires_at: expiresAt
    });
  } catch (error) {
    console.error('[Set Cookie API] Error setting cookie:', error.message);
    return res.status(500).json({ 
      error: 'Failed to set cookie',
      details: error.message
    });
  }
}

