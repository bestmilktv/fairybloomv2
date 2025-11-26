/**
 * Favorites API Endpoint - ADMIN API ONLY VERSION (ROBUST ID FIX)
 */

import { getAuthCookie } from '../utils/cookies.js';

// Environment check
const SHOP_ID = process.env.VITE_SHOPIFY_SHOP_ID || process.env.SHOPIFY_SHOP_ID;
const STORE_DOMAIN = process.env.VITE_SHOPIFY_STORE_DOMAIN || process.env.SHOPIFY_STORE_DOMAIN;
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;
const ADMIN_API_VERSION = '2024-04';

const ADMIN_GRAPHQL_URL = STORE_DOMAIN
  ? `https://${STORE_DOMAIN}/admin/api/${ADMIN_API_VERSION}/graphql.json`
  : null;

/**
 * Helper: Decode and Format Customer ID for Admin API
 * Robustly handles Numbers, Strings, Base64, and GIDs
 */
function formatAdminGid(rawId) {
  if (!rawId) return null;
  
  // FIX: Force convert to string to avoid "rawId.startsWith is not a function"
  let idString = String(rawId).trim();
  
  // 1. If it's already a GID, return it
  if (idString.startsWith('gid://shopify/Customer/')) {
    return idString;
  }

  // 2. Try to decode if it looks like Base64 (ends with =)
  if (idString.length > 20 && idString.endsWith('=')) {
    try {
      const decoded = Buffer.from(idString, 'base64').toString('utf-8');
      if (decoded.startsWith('gid://')) {
        idString = decoded;
      }
    } catch (e) {
      // Not base64 or failed, continue with original string
    }
  }

  // 3. Extract just the numbers (works for "12345", "gid://.../12345", etc.)
  const match = idString.match(/Customer\/(\d+)/) || idString.match(/^(\d+)$/);
  
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
    throw new Error('Admin API configuration missing (Check env vars)');
  }

  const response = await fetch(ADMIN_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': ADMIN_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Shopify Admin API Error (${response.status}): ${text}`);
  }

  const data = await response.json();

  if (data.errors) {
    const msg = data.errors.map(e => e.message).join(', ');
    throw new Error(`GraphQL Error: ${msg}`);
  }

  return data;
}

/**
 * API Handler
 */
export default async function handler(req, res) {
  // 1. Authenticate User via Cookies
  let authData;
  try {
    authData = getAuthCookie(req);
  } catch (e) {
    console.error('[Favorites] Cookie parsing error:', e);
    return res.status(401).json({ error: 'Invalid session cookies' });
  }
  
  if (!authData || !authData.access_token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // 2. Get Customer ID from Auth Data safely
  const rawCustomerId = authData.customer?.sub;
  
  console.log('[Favorites] Raw Customer ID from cookie:', rawCustomerId, 'Type:', typeof rawCustomerId);

  const customerGid = formatAdminGid(rawCustomerId);

  if (!customerGid) {
    console.error('[Favorites] Failed to parse Customer ID:', rawCustomerId);
    return res.status(400).json({ error: 'Invalid Customer ID format' });
  }

  // console.log('[Favorites] Using Admin GID:', customerGid);
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
          console.warn('[Favorites] Customer not found in Admin API:', customerGid);
        return res.status(200).json({ favorites: [] });
      }

        const metafieldValue = result.data.customer.metafield?.value;
        const favorites = metafieldValue ? JSON.parse(metafieldValue) : [];
        
        return res.status(200).json({ favorites: Array.isArray(favorites) ? favorites : [] });

      } catch (error) {
        console.error('[Favorites] Read Error:', error.message);
        // Return empty array instead of crashing if read fails
        return res.status(200).json({ favorites: [], error: 'Read failed' });
      }
    }

    // --- POST/DELETE: Update Favorites ---
    if (req.method === 'POST' || req.method === 'DELETE') {
      const { productId } = req.body;
      if (!productId) return res.status(400).json({ error: 'Product ID required' });

      // Step A: Read current list first
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
        // Add unique
      if (!currentFavorites.includes(productId)) {
        currentFavorites.push(productId);
      }
      } else {
        // Delete
        currentFavorites = currentFavorites.filter(id => id !== productId);
      }

      // Step C: Write back to Shopify
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
              value: JSON.stringify(currentFavorites)
          }
        ]
        }
      };

      const updateResult = await fetchAdminAPI(updateQuery, variables);

      if (updateResult.data?.customerUpdate?.userErrors?.length > 0) {
        const err = updateResult.data.customerUpdate.userErrors[0].message;
        // Check for permissions error specifically
        if (err.includes('access the Customer object')) {
           console.error('!!! CRITICAL: App needs "write_customers" scope in Shopify Admin !!!');
        }
        throw new Error(err);
      }

      return res.status(200).json({ favorites: currentFavorites });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('[Favorites] Critical Error:', error.message);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}