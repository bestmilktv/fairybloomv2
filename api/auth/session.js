/**
 * Session sharing endpoint for checkout integration
 * Allows checkout page to check if user is authenticated
 */

import { getAuthCookie } from '../utils/cookies.js';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const authData = getAuthCookie(req);
    
    if (!authData || !authData.customer) {
      return res.status(200).json({ 
        authenticated: false,
        customer: null 
      });
    }

    // Return customer data for checkout
    return res.status(200).json({
      authenticated: true,
      customer: {
        id: authData.customer.sub,
        email: authData.customer.email,
        firstName: authData.customer.firstName,
        lastName: authData.customer.lastName
      }
    });
  } catch (error) {
    console.error('Session API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
