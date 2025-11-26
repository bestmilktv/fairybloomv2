/**
 * Favorites API Endpoint
 * Handles favorite products using Shopify Customer Account API metafields
 */

import { getAuthCookie } from '../utils/cookies.js';

const SHOP_ID = process.env.VITE_SHOPIFY_SHOP_ID || process.env.SHOPIFY_SHOP_ID;
const CUSTOMER_ACCOUNT_URL = `https://shopify.com/${SHOP_ID}/account/customer/api/unstable/graphql`;

/**
 * Make authenticated request to Customer Account API
 * Uses same authentication approach as api/auth/customer.js
 * @param {string} query - GraphQL query
 * @param {object} variables - Query variables
 * @param {object} req - Request object (for cookies)
 * @param {string} accessToken - Access token (fallback)
 */
async function fetchCustomerAccount(query, variables = {}, req = null, accessToken = null) {
  const headers = {
    'Content-Type': 'application/json',
  };

  let hasCookies = false;
  let hasToken = false;

  // Method 1: Add cookies if available
  if (req && req.headers.cookie) {
    headers['Cookie'] = req.headers.cookie;
    hasCookies = true;
    console.log('[Favorites] Using cookies for authentication (length):', req.headers.cookie.length);
  }

  // Method 2: Add token if available (use both if possible for better compatibility)
  if (accessToken && typeof accessToken === 'string') {
    const tokenPreview = `${accessToken.slice(0, 6)}...${accessToken.slice(-4)}`;
    console.log('[Favorites] Using customer access token in header:', tokenPreview, '(length:', accessToken.length, ')');
    
    // Try both header formats
    headers['Shopify-Customer-Access-Token'] = accessToken;
    headers['Authorization'] = `Bearer ${accessToken}`;
    hasToken = true;
  }

  if (!hasCookies && !hasToken) {
    console.error('[Favorites] Missing both cookies and access token');
    throw new Error('Authentication required - missing cookies or access token');
  }

  console.log('[Favorites] Sending request with headers:', {
    'Content-Type': 'application/json',
    hasCookie: hasCookies,
    hasShopifyToken: hasToken,
    hasAuthorization: hasToken
  });

  const response = await fetch(CUSTOMER_ACCOUNT_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Favorites] Shopify Customer Account API error: ${response.status}`, errorText);
    
    // If we used both cookies and token and it failed, try with token only
    if (response.status === 401 && hasCookies && hasToken) {
      console.log('[Favorites] 401 with cookies+token, trying with access token header only...');
      const headersAlt = {
        'Content-Type': 'application/json',
        'Shopify-Customer-Access-Token': accessToken,
        'Authorization': `Bearer ${accessToken}`
      };
      
      const responseAlt = await fetch(CUSTOMER_ACCOUNT_URL, {
        method: 'POST',
        headers: headersAlt,
        body: JSON.stringify({
          query,
          variables,
        }),
      });
      
      if (responseAlt.ok) {
        const dataAlt = await responseAlt.json();
        if (dataAlt.errors && dataAlt.errors.length > 0) {
          const errorMessages = dataAlt.errors.map((error) => error.message).join(', ');
          console.error('[Favorites] GraphQL errors (Alt):', errorMessages);
          throw new Error(`GraphQL errors: ${errorMessages}`);
        }
        console.log('[Favorites] Success with access token header only');
        return dataAlt;
      }
    }
    
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  if (data.errors && data.errors.length > 0) {
    const errorMessages = data.errors.map((error) => error.message).join(', ');
    console.error('[Favorites] GraphQL errors:', errorMessages);
    throw new Error(`GraphQL errors: ${errorMessages}`);
  }

  return data;
}

/**
 * GET /api/favorites - Get favorite products
 */
export default async function handler(req, res) {
  // Get access token from cookie
  const authData = getAuthCookie(req);
  
  if (!authData || !authData.access_token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const accessToken = authData.access_token;
  const tokenPreview = `${accessToken.slice(0, 6)}...${accessToken.slice(-4)}`;
  console.log('[Favorites] access_token preview:', tokenPreview, '(length:', accessToken.length, ')');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');

  try {
    // GET - Fetch favorites
    if (req.method === 'GET') {
      const query = `
        query {
          customer {
            metafield(namespace: "custom", key: "favorites") {
              id
              value
            }
          }
        }
      `;

      // Pass both req (for cookies) and accessToken (for fallback)
      const result = await fetchCustomerAccount(query, {}, req, accessToken);
      
      if (!result.data.customer) {
        return res.status(200).json({ favorites: [] });
      }

      const metafield = result.data.customer.metafield;
      if (!metafield || !metafield.value) {
        return res.status(200).json({ favorites: [] });
      }

      try {
        const favorites = JSON.parse(metafield.value);
        return res.status(200).json({ favorites: Array.isArray(favorites) ? favorites : [] });
      } catch (parseError) {
        console.error('Error parsing favorites metafield:', parseError);
        return res.status(200).json({ favorites: [] });
      }
    }

    // POST - Add favorite
    if (req.method === 'POST') {
      const { productId } = req.body;

      if (!productId) {
        return res.status(400).json({ error: 'Product ID is required' });
      }

      // First, get current favorites
      const getQuery = `
        query {
          customer {
            metafield(namespace: "custom", key: "favorites") {
              id
              value
            }
          }
        }
      `;

      const getResult = await fetchCustomerAccount(getQuery, {}, req, accessToken);
      let currentFavorites = [];

      if (getResult.data.customer?.metafield?.value) {
        try {
          currentFavorites = JSON.parse(getResult.data.customer.metafield.value);
          if (!Array.isArray(currentFavorites)) {
            currentFavorites = [];
          }
        } catch (e) {
          currentFavorites = [];
        }
      }

      // Add product if not already in favorites
      if (!currentFavorites.includes(productId)) {
        currentFavorites.push(productId);
      }

      // Update metafield
      const updateQuery = `
        mutation customerUpdate($metafields: [MetafieldsSetInput!]!) {
          customerUpdate(input: {
            metafields: $metafields
          }) {
            customer {
              id
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const updateVariables = {
        metafields: [
          {
            namespace: 'custom',
            key: 'favorites',
            value: JSON.stringify(currentFavorites),
            type: 'single_line_text_field'
          }
        ]
      };

      const updateResult = await fetchCustomerAccount(updateQuery, updateVariables, req, accessToken);

      if (updateResult.data.customerUpdate.userErrors.length > 0) {
        const errorMessage = updateResult.data.customerUpdate.userErrors[0].message;
        return res.status(400).json({ error: errorMessage });
      }

      return res.status(200).json({ favorites: currentFavorites });
    }

    // DELETE - Remove favorite
    if (req.method === 'DELETE') {
      const { productId } = req.body;

      if (!productId) {
        return res.status(400).json({ error: 'Product ID is required' });
      }

      // First, get current favorites
      const getQuery = `
        query {
          customer {
            metafield(namespace: "custom", key: "favorites") {
              id
              value
            }
          }
        }
      `;

      const getResult = await fetchCustomerAccount(getQuery, {}, req, accessToken);
      let currentFavorites = [];

      if (getResult.data.customer?.metafield?.value) {
        try {
          currentFavorites = JSON.parse(getResult.data.customer.metafield.value);
          if (!Array.isArray(currentFavorites)) {
            currentFavorites = [];
          }
        } catch (e) {
          currentFavorites = [];
        }
      }

      // Remove product from favorites
      currentFavorites = currentFavorites.filter(id => id !== productId);

      // Update metafield
      const updateQuery = `
        mutation customerUpdate($metafields: [MetafieldsSetInput!]!) {
          customerUpdate(input: {
            metafields: $metafields
          }) {
            customer {
              id
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const updateVariables = {
        metafields: [
          {
            namespace: 'custom',
            key: 'favorites',
            value: JSON.stringify(currentFavorites),
            type: 'single_line_text_field'
          }
        ]
      };

      const updateResult = await fetchCustomerAccount(updateQuery, updateVariables, req, accessToken);

      if (updateResult.data.customerUpdate.userErrors.length > 0) {
        const errorMessage = updateResult.data.customerUpdate.userErrors[0].message;
        return res.status(400).json({ error: errorMessage });
      }

      return res.status(200).json({ favorites: currentFavorites });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Favorites API error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

