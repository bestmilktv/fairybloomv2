/**
 * Customer Data Endpoint
 * Fetches customer profile data using the access token from HTTP-only cookie
 */

import { getAuthCookie } from '../utils/cookies.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authData = getAuthCookie(req);
    
    if (!authData || !authData.customer) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Vrátit data z cookie
    return res.status(200).json({
      id: authData.customer.sub,
      email: authData.customer.email,
      firstName: authData.customer.firstName,
      lastName: authData.customer.lastName
    });
  } catch (error) {
    console.error('Customer API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
