/**
 * Cart API Endpoint - Store/Retrieve Cart ID in Shopify Metafield
 * Similar to favorites, but stores cartId for cross-device cart synchronization
 */

import { getAuthCookie } from '../utils/cookies.js';

// Environment check
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
  
  // Force convert to string to avoid "rawId.startsWith is not a function"
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
    console.error('[Cart] Cookie parsing error:', e);
    return res.status(401).json({ error: 'Invalid session cookies' });
  }
  
  if (!authData || !authData.access_token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  // 2. Get Customer ID from Auth Data safely
  const rawCustomerId = authData.customer?.sub;
  
  console.log('[Cart] Raw Customer ID from cookie:', rawCustomerId, 'Type:', typeof rawCustomerId);

  const customerGid = formatAdminGid(rawCustomerId);

  if (!customerGid) {
    console.error('[Cart] Failed to parse Customer ID:', rawCustomerId);
    return res.status(400).json({ error: 'Invalid Customer ID format' });
  }

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');

  try {
    // --- GET: Read Cart ID ---
    if (req.method === 'GET') {
      const query = `
        query getCustomerCart($id: ID!) {
          customer(id: $id) {
            id
            metafield(namespace: "custom", key: "cart_id") {
              value
            }
          }
        }
      `;

      try {
        const result = await fetchAdminAPI(query, { id: customerGid });
        
        if (!result.data?.customer) {
          console.warn('[Cart] Customer not found in Admin API:', customerGid);
          return res.status(200).json({ cartId: null });
        }

        const metafieldValue = result.data.customer.metafield?.value;
        const cartId = metafieldValue || null;
        
        return res.status(200).json({ cartId });

      } catch (error) {
        console.error('[Cart] Read Error:', error.message);
        // Return null instead of crashing if read fails
        return res.status(200).json({ cartId: null, error: 'Read failed' });
      }
    }

    // --- POST: Save Cart ID ---
    if (req.method === 'POST') {
      const { cartId } = req.body;
      
      // Allow null to clear the metafield
      if (cartId !== null && (!cartId || typeof cartId !== 'string')) {
        return res.status(400).json({ error: 'Cart ID must be a string or null' });
      }
      
      // If cartId is null, we'll set it to empty string to clear the metafield
      const valueToStore = cartId || '';

      // Write cartId to Shopify metafield
      const updateQuery = `
        mutation customerUpdate($input: CustomerInput!) {
          customerUpdate(input: $input) {
            customer {
              metafield(namespace: "custom", key: "cart_id") {
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
              key: 'cart_id',
              value: valueToStore
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

      return res.status(200).json({ cartId: cartId || null, success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('[Cart] Critical Error:', error.message);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}

