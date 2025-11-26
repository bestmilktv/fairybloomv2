/**
 * Favorites API Endpoint
 * Handles favorite products using Shopify Customer Account API (read) and Admin API (write)
 */

import { getAuthCookie } from '../utils/cookies.js';

const SHOP_ID = process.env.VITE_SHOPIFY_SHOP_ID || process.env.SHOPIFY_SHOP_ID;
const CUSTOMER_ACCOUNT_URL = `https://shopify.com/${SHOP_ID}/account/customer/api/unstable/graphql`;

// Admin API for writing metafields
const STORE_DOMAIN = process.env.VITE_SHOPIFY_STORE_DOMAIN || process.env.SHOPIFY_STORE_DOMAIN;
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;
const ADMIN_API_VERSION = '2024-04';
const ADMIN_GRAPHQL_URL = STORE_DOMAIN
  ? `https://${STORE_DOMAIN}/admin/api/${ADMIN_API_VERSION}/graphql.json`
  : null;

/**
 * Helper: Decode Base64 ID if necessary
 */
function getCleanId(id) {
  if (!id) return null;
  try {
    const decoded = Buffer.from(id, 'base64').toString('utf-8');
    if (decoded.includes('gid://')) {
      return decoded;
    }
    return id;
  } catch (e) {
    return id;
  }
}

/**
 * Make authenticated request to Customer Account API
 */
async function fetchCustomerAccount(query, variables = {}, req = null, accessToken = null) {
  const headers = {
    'Content-Type': 'application/json',
  };

  // 1. Extract token
  let tokenToUse = accessToken;

  if (!tokenToUse && req && req.headers.cookie) {
    try {
      const authData = getAuthCookie(req);
      if (authData && authData.access_token) {
        tokenToUse = authData.access_token;
      }
    } catch (error) {
      console.warn('[Favorites] Cookie parsing failed:', error.message);
    }
  }

  if (!tokenToUse) {
    throw new Error('Authentication required - no token found');
  }

  // 2. Set Headers - THE FIX
  // Shopify Customer Account API requires the Authorization header.
  // Based on previous logs, "Bearer" prefix causes "missing prefix shcat_" error.
  // So we send the raw token directly in Authorization header.
  
  headers['Authorization'] = tokenToUse; 
  headers['Shopify-Customer-Access-Token'] = tokenToUse; // Posíláme pro jistotu i tento

  console.log('[Favorites] Sending request with headers:', {
    hasAuthorization: !!headers['Authorization'],
    authHeaderStart: headers['Authorization'].substring(0, 10) + '...'
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
    
    if (response.status === 401) {
      throw new Error('Authentication required (401 from Shopify)');
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
  const authData = getAuthCookie(req);
  
  if (!authData || !authData.access_token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const accessToken = authData.access_token;
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');

  try {
    // GET - Fetch favorites
    if (req.method === 'GET') {
      const query = `
        query {
          customer {
            id
            metafield(namespace: "custom", key: "favorites") {
              id
              value
            }
          }
        }
      `;

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
        return res.status(200).json({ favorites: [] });
      }
    }

    // POST or DELETE
    if (req.method === 'POST' || req.method === 'DELETE') {
      const { productId } = req.body;

      if (!productId) {
        return res.status(400).json({ error: 'Product ID is required' });
      }

      // 1. Get current favorites (READ)
      const getQuery = `
        query {
          customer {
            id
            metafield(namespace: "custom", key: "favorites") {
              value
            }
          }
        }
      `;

      const getResult = await fetchCustomerAccount(getQuery, {}, req, accessToken);
      let currentFavorites = [];

      // Extract and clean Customer ID
      let rawCustomerId = getResult.data.customer?.id || authData.customer?.sub;

      if (!rawCustomerId) {
        return res.status(400).json({ error: 'Could not identify customer ID' });
      }

      const decodedId = getCleanId(rawCustomerId);
      const idMatch = decodedId.match(/Customer\/(\d+)/);
      const cleanIdNumber = idMatch ? idMatch[1] : decodedId;
      const adminCustomerGid = `gid://shopify/Customer/${cleanIdNumber}`;

      if (getResult.data.customer?.metafield?.value) {
        try {
          currentFavorites = JSON.parse(getResult.data.customer.metafield.value);
          if (!Array.isArray(currentFavorites)) currentFavorites = [];
        } catch (e) {
          currentFavorites = [];
        }
      }

      // 2. Modify array
      if (req.method === 'POST') {
        if (!currentFavorites.includes(productId)) {
          currentFavorites.push(productId);
        }
      } else if (req.method === 'DELETE') {
        currentFavorites = currentFavorites.filter(id => id !== productId);
      }

      // 3. Write to Admin API
      if (!ADMIN_GRAPHQL_URL || !ADMIN_TOKEN) {
        console.error('[Favorites] Admin API not configured');
        return res.status(500).json({ error: 'Server configuration error' });
      }

      const updateQuery = `
        mutation customerUpdate($input: CustomerInput!) {
          customerUpdate(input: $input) {
            customer {
              id
              metafield(namespace: "custom", key: "favorites") {
                value
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `;

      const updateVariables = {
        input: {
          id: adminCustomerGid,
          metafields: [
            {
              namespace: 'custom',
              key: 'favorites',
              value: JSON.stringify(currentFavorites),
              type: 'json'
            }
          ]
        }
      };

      const adminResponse = await fetch(ADMIN_GRAPHQL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Shopify-Access-Token': ADMIN_TOKEN,
        },
        body: JSON.stringify({
          query: updateQuery,
          variables: updateVariables,
        }),
      });

      const adminData = await adminResponse.json();

      if (adminData.errors) {
        console.error('[Favorites] Admin API Errors:', JSON.stringify(adminData.errors));
        return res.status(500).json({ error: 'Failed to save to Shopify' });
      }

      if (adminData.data?.customerUpdate?.userErrors?.length > 0) {
        const msg = adminData.data.customerUpdate.userErrors[0].message;
        console.error('[Favorites] User Errors:', msg);
        return res.status(400).json({ error: msg });
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