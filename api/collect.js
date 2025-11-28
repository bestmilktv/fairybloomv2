/**
 * Shopify Collect API Endpoint
 * Handles analytics/collect requests from Shopify checkout
 * This endpoint is called by Shopify checkout for tracking/analytics purposes
 */

const ALLOWED_ORIGINS = [
  'https://fairybloom.cz',
  'https://www.fairybloom.cz',
  'https://pokladna.fairybloom.cz'
];

/**
 * Set CORS headers dynamically based on request origin
 */
function setCorsHeaders(res, origin) {
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
  } else {
    // Fallback: allow all origins if not in allowed list (for development)
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Max-Age', '86400');
}

export default async function handler(req, res) {
  const origin = req.headers.origin;
  
  // Handle preflight OPTIONS request
  if (req.method === 'OPTIONS') {
    setCorsHeaders(res, origin);
    return res.status(200).end();
  }

  // Set CORS headers for actual request
  setCorsHeaders(res, origin);

  // Handle POST request (Shopify collect data)
  if (req.method === 'POST') {
    try {
      // Log the collect data (optional, for debugging)
      // You can remove this in production if not needed
      if (process.env.NODE_ENV === 'development') {
        console.log('[Collect API] Received collect data:', req.body);
      }
      
      // Return success response
      // Shopify checkout expects a 200 OK response
      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('[Collect API] Error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Handle GET request (health check)
  if (req.method === 'GET') {
    return res.status(200).json({ 
      success: true, 
      message: 'Collect API endpoint',
      timestamp: new Date().toISOString()
    });
  }

  // Method not allowed
  return res.status(405).json({ error: 'Method not allowed' });
}

