/**
 * Favorites API Endpoint - ADMIN API ONLY VERSION
 * * FIX: Bypasses "InvalidScope" errors on Customer Account API by using
 * Admin API for BOTH reading and writing.
 */

import { getAuthCookie } from '../utils/cookies.js';

const SHOP_ID = process.env.VITE_SHOPIFY_SHOP_ID || process.env.SHOPIFY_SHOP_ID;

// Admin API Configuration
const STORE_DOMAIN = process.env.VITE_SHOPIFY_STORE_DOMAIN || process.env.SHOPIFY_STORE_DOMAIN;
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;
const ADMIN_API_VERSION = '2024-04';
const ADMIN_GRAPHQL_URL = STORE_DOMAIN
  ? `https://${STORE_DOMAIN}/admin/api/${ADMIN_API_VERSION}/graphql.json`
  : null;

/**
 * Helper: Decode and Format Customer ID for Admin API
 * Transforms various ID formats into "gid://shopify/Customer/123456789"
 */
function formatAdminGid(rawId) {
  if (!rawId) return null;
  
  let cleanId = rawId;
  
  // Try to decode if it looks like Base64 (and isn't already a gid)
  if (!rawId.startsWith('gid://') && rawId.length > 20 && rawId.endsWith('=')) {
    try {
      const decoded = Buffer.from(rawId, 'base64').toString('utf-8');
      cleanId = decoded;
    } catch (e) {
      // Not base64, keep original
    }
  }

  // Extract just the numbers
  const match = cleanId.match(/Customer\/(\d+)/) || cleanId.match(/^(\d+)$/);
  
  if (match && match[1]) {
    return `gid://shopify/Customer/${match[1]}`;
  }
  
  return null; // Could not parse ID
}

/**
 * Execute Query against Admin API
 */
async function fetchAdminAPI(query, variables = {}) {
  if (!ADMIN_GRAPHQL_URL || !ADMIN_TOKEN) {
    throw new Error('Admin API configuration missing');
  }

  const response = await fetch(ADMIN_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': ADMIN_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  const data = await response.json();

  if (data.errors) {
    const msg = data.errors.map(e => e.message).join(', ');
    throw new Error(`Admin API Error: ${msg}`);
  }

  return data;
}

/**
 * API Handler
 */
export default async function handler(req, res) {
  // 1. Authenticate User via Cookies
  const authData = getAuthCookie(req);
  
  if (!authData || !authData.access_token) {
    console.warn('[Favorites] No auth cookie found');
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // 2. Get Customer ID from Auth Data
  const rawCustomerId = authData.customer?.sub;
  const customerGid = formatAdminGid(rawCustomerId);

  if (!customerGid) {
    console.error('[Favorites] Could not parse Customer ID from:', rawCustomerId);
    return res.status(400).json({ error: 'Invalid Customer ID' });
  }

  // console.log('[Favorites] Acting for Customer:', customerGid);
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');

  try {
    // --- GET: Read Favorites ---
    if (req.method === 'GET') {
      const query = `
        query getCustomerFavorites($id: ID!) {
          customer(id: $id) {
            id
            metafield(namespace: "custom", key: "favorites") {
              value
            }
          }
        }
      `;

      try {
        const result = await fetchAdminAPI(query, { id: customerGid });
        
        if (!result.data?.customer) {
          // Customer might not exist in Admin yet or ID mismatch
          console.warn('[Favorites] Customer not found in Admin API:', customerGid);
          return res.status(200).json({ favorites: [] });
        }

        const metafieldValue = result.data.customer.metafield?.value;
        const favorites = metafieldValue ? JSON.parse(metafieldValue) : [];
        
        return res.status(200).json({ favorites: Array.isArray(favorites) ? favorites : [] });

      } catch (error) {
        console.error('[Favorites] Read Error:', error.message);
        // If read fails (e.g. permission error), return empty array instead of 500 to keep app running
        return res.status(200).json({ favorites: [], error: 'Read failed' });
      }
    }

    // --- POST/DELETE: Update Favorites ---
    if (req.method === 'POST' || req.method === 'DELETE') {
      const { productId } = req.body;
      if (!productId) return res.status(400).json({ error: 'Product ID required' });

      // Step A: Read current list first (Admin API)
      const readQuery = `
        query getCustomerFavorites($id: ID!) {
          customer(id: $id) {
            metafield(namespace: "custom", key: "favorites") {
              value
            }
          }
        }
      `;
      
      const readResult = await fetchAdminAPI(readQuery, { id: customerGid });
      const currentMetafield = readResult.data?.customer?.metafield?.value;
      let currentFavorites = currentMetafield ? JSON.parse(currentMetafield) : [];
      if (!Array.isArray(currentFavorites)) currentFavorites = [];

      // Step B: Modify list
      if (req.method === 'POST') {
        if (!currentFavorites.includes(productId)) {
          currentFavorites.push(productId);
        }
      } else {
        currentFavorites = currentFavorites.filter(id => id !== productId);
      }

      // Step C: Write back to Shopify (Admin API)
      const updateQuery = `
        mutation customerUpdate($input: CustomerInput!) {
          customerUpdate(input: $input) {
            customer {
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

      const variables = {
        input: {
          id: customerGid,
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

      const updateResult = await fetchAdminAPI(updateQuery, variables);

      if (updateResult.data?.customerUpdate?.userErrors?.length > 0) {
        const err = updateResult.data.customerUpdate.userErrors[0].message;
        throw new Error(err);
      }

      return res.status(200).json({ favorites: currentFavorites });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('[Favorites] Critical Error:', error.message);
    // If it's a permission error, tell the user clearly
    if (error.message.includes('access the Customer object')) {
      console.error('!!! ACTION REQUIRED: Go to Shopify Admin -> Apps -> [Your App] -> Configuration -> Admin API integration -> Enable "read_customers" and "write_customers" !!!');
    }
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}