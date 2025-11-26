/**
 * Favorites API Endpoint
 * Handles favorite products using Shopify Customer Account API (read) and Admin API (write)
 * 
 * Note: Customer Account API can READ metafields but cannot WRITE them.
 * For writing, we need to use Admin API through a proxy.
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

  // Extract token from cookies if available
  let tokenFromCookies = null;
  if (req && req.headers.cookie) {
    try {
      const authData = getAuthCookie(req);
      if (authData && authData.access_token) {
        tokenFromCookies = authData.access_token;
        const tokenPreview = `${tokenFromCookies.slice(0, 6)}...${tokenFromCookies.slice(-4)}`;
        console.log('[Favorites] Extracted token from cookies:', tokenPreview, '(length:', tokenFromCookies.length, ')');
        console.log('[Favorites] Token starts with shcat_:', tokenFromCookies.startsWith('shcat_'));
      } else {
        console.warn('[Favorites] Cookies present but no access_token found in authData');
      }
    } catch (error) {
      console.error('[Favorites] Error extracting token from cookies:', error.message);
      console.error('[Favorites] Error stack:', error.stack);
    }
  }

  // Method 1: Try with cookies + token in headers (extract token from cookies)
  if (req && req.headers.cookie && tokenFromCookies) {
    headers['Cookie'] = req.headers.cookie;
    // Extract token from cookies and use it in headers simultaneously with cookies
    // Use both header formats for maximum compatibility
    headers['Shopify-Customer-Access-Token'] = tokenFromCookies;
    headers['Authorization'] = `Bearer ${tokenFromCookies}`;
    console.log('[Favorites] Using cookies + Authorization header (token extracted from cookies)');
  } 
  // Method 2: Try with provided access token in header
  else if (accessToken && typeof accessToken === 'string') {
    const tokenPreview = `${accessToken.slice(0, 6)}...${accessToken.slice(-4)}`;
    console.log('[Favorites] Using customer access token in header:', tokenPreview, '(length:', accessToken.length, ')');
    
    // Try both header formats
    headers['Shopify-Customer-Access-Token'] = accessToken;
    headers['Authorization'] = `Bearer ${accessToken}`;
  } else {
    console.error('[Favorites] Missing both cookies and access token');
    throw new Error('Authentication required - missing cookies or access token');
  }

  console.log('[Favorites] Sending request with headers:', {
    'Content-Type': 'application/json',
    hasCookie: !!headers['Cookie'],
    hasShopifyToken: !!headers['Shopify-Customer-Access-Token'],
    hasAuthorization: !!headers['Authorization']
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
    console.error('[Favorites] Request headers sent:', {
      hasCookie: !!headers['Cookie'],
      cookieLength: headers['Cookie'] ? headers['Cookie'].length : 0,
      hasShopifyToken: !!headers['Shopify-Customer-Access-Token'],
      shopifyTokenPreview: headers['Shopify-Customer-Access-Token'] 
        ? `${headers['Shopify-Customer-Access-Token'].slice(0, 6)}...${headers['Shopify-Customer-Access-Token'].slice(-4)}`
        : null,
      hasAuthorization: !!headers['Authorization'],
      authorizationPreview: headers['Authorization'] 
        ? headers['Authorization'].substring(0, 20) + '...'
        : null
    });
    
    // If cookies + token failed, try with token only (without cookies)
    if (response.status === 401 && headers['Cookie'] && (accessToken || tokenFromCookies)) {
      const tokenToUse = accessToken || tokenFromCookies;
      const tokenPreview = `${tokenToUse.slice(0, 6)}...${tokenToUse.slice(-4)}`;
      console.log('[Favorites] 401 with cookies+token, trying with access token header only...');
      console.log('[Favorites] Fallback token preview:', tokenPreview, '(length:', tokenToUse.length, ')');
      console.log('[Favorites] Fallback token starts with shcat_:', tokenToUse.startsWith('shcat_'));
      
      const headersAlt = {
        'Content-Type': 'application/json',
        'Shopify-Customer-Access-Token': tokenToUse,
        'Authorization': `Bearer ${tokenToUse}`
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
      } else {
        const errorTextAlt = await responseAlt.text();
        console.error(`[Favorites] Fallback also failed: ${responseAlt.status}`, errorTextAlt);
        console.error('[Favorites] Fallback request headers:', {
          hasShopifyToken: !!headersAlt['Shopify-Customer-Access-Token'],
          hasAuthorization: !!headersAlt['Authorization']
        });
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

      // Update metafield using Admin API (write) - Customer Account API cannot write metafields
      if (!ADMIN_GRAPHQL_URL || !ADMIN_TOKEN) {
        console.error('[Favorites] Admin API not configured for writing metafields');
        return res.status(500).json({ error: 'Admin API not configured' });
      }

      const customerId = authData.customer?.sub;
      if (!customerId) {
        return res.status(400).json({ error: 'Customer ID not found' });
      }

      // Build customer GID
      const customerGid = customerId.startsWith('gid://') 
        ? customerId 
        : `gid://shopify/Customer/${customerId}`;

      const updateQuery = `
        mutation customerUpdate($input: CustomerInput!) {
          customerUpdate(input: $input) {
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
        input: {
          id: customerGid,
          metafields: [
            {
              namespace: 'custom',
              key: 'favorites',
              value: JSON.stringify(currentFavorites),
              type: 'single_line_text_field'
            }
          ]
        }
      };

      // Use Admin API for writing
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

      if (!adminResponse.ok) {
        const errorText = await adminResponse.text();
        console.error('[Favorites] Admin API error:', adminResponse.status, errorText);
        return res.status(500).json({ error: 'Failed to update favorites' });
      }

      const adminData = await adminResponse.json();

      if (adminData.errors && adminData.errors.length > 0) {
        const errorMessages = adminData.errors.map((error) => error.message).join(', ');
        console.error('[Favorites] Admin API GraphQL errors:', errorMessages);
        return res.status(400).json({ error: errorMessages });
      }

      if (adminData.data?.customerUpdate?.userErrors?.length > 0) {
        const errorMessage = adminData.data.customerUpdate.userErrors[0].message;
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

      // First, get current favorites using Customer Account API (read)
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

      // Update metafield using Admin API (write) - Customer Account API cannot write metafields
      if (!ADMIN_GRAPHQL_URL || !ADMIN_TOKEN) {
        console.error('[Favorites] Admin API not configured for writing metafields');
        return res.status(500).json({ error: 'Admin API not configured' });
      }

      const customerId = authData.customer?.sub;
      if (!customerId) {
        return res.status(400).json({ error: 'Customer ID not found' });
      }

      // Build customer GID
      const customerGid = customerId.startsWith('gid://') 
        ? customerId 
        : `gid://shopify/Customer/${customerId}`;

      const updateQuery = `
        mutation customerUpdate($input: CustomerInput!) {
          customerUpdate(input: $input) {
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
        input: {
          id: customerGid,
          metafields: [
            {
              namespace: 'custom',
              key: 'favorites',
              value: JSON.stringify(currentFavorites),
              type: 'single_line_text_field'
            }
          ]
        }
      };

      // Use Admin API for writing
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

      if (!adminResponse.ok) {
        const errorText = await adminResponse.text();
        console.error('[Favorites] Admin API error:', adminResponse.status, errorText);
        return res.status(500).json({ error: 'Failed to update favorites' });
      }

      const adminData = await adminResponse.json();

      if (adminData.errors && adminData.errors.length > 0) {
        const errorMessages = adminData.errors.map((error) => error.message).join(', ');
        console.error('[Favorites] Admin API GraphQL errors:', errorMessages);
        return res.status(400).json({ error: errorMessages });
      }

      if (adminData.data?.customerUpdate?.userErrors?.length > 0) {
        const errorMessage = adminData.data.customerUpdate.userErrors[0].message;
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

