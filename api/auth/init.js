/**
 * OAuth Initialization Endpoint
 * Stores state and code_verifier in session for the callback
 */

import { setTempCookie } from '../utils/cookies.js';

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { state, codeVerifier } = req.body;

    if (!state || !codeVerifier) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    // Store state and code_verifier in HTTP-only cookies (10 minutes expiration)
    setTempCookie(res, 'oauth_state', state, 600);
    setTempCookie(res, 'oauth_code_verifier', codeVerifier, 600);

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error('OAuth init error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
