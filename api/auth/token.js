/**
 * Get customer access token for cart association
 * This endpoint returns the access token for authenticated customers
 */

import { getAuthCookie } from '../utils/cookies.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authData = getAuthCookie(req);
    
    if (!authData || !authData.access_token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Return access token for cart association
    return res.status(200).json({
      accessToken: authData.access_token
    });
  } catch (error) {
    console.error('Token API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
