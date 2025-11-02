/**
 * Favorites API Endpoint
 * Handles favorite products using Shopify Customer Account API metafields
 */

import { getAuthCookie } from '../utils/cookies.js';

const SHOP_ID = process.env.VITE_SHOPIFY_SHOP_ID || process.env.SHOPIFY_SHOP_ID;
const CUSTOMER_ACCOUNT_URL = `https://shopify.com/${SHOP_ID}/account/customer/api/unstable/graphql`;

/**
 * Make authenticated request to Customer Account API
 * @param {string} query - GraphQL query
 * @param {object} variables - Query variables
 */
async function fetchCustomerAccount(query, variables = {}, accessToken) {
  if (!accessToken || typeof accessToken !== 'string') {
    console.error('[Favorites] Missing customer access token');
    throw new Error('Authentication required');
  }

  const tokenPreview = `${accessToken.slice(0, 6)}...${accessToken.slice(-4)}`;
  console.log('[Favorites] Using customer access token:', tokenPreview, '(length:', accessToken.length, ')');

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`
  };

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
    console.error(`Shopify Customer Account API error: ${response.status}`, errorText);
    
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  if (data.errors && data.errors.length > 0) {
    const errorMessages = data.errors.map((error) => error.message).join(', ');
    console.error('GraphQL errors from Shopify:', errorMessages);
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

      const result = await fetchCustomerAccount(query, {}, accessToken);
      
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

      const getResult = await fetchCustomerAccount(getQuery, {}, accessToken);
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

      const updateResult = await fetchCustomerAccount(updateQuery, updateVariables, accessToken);

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

      const getResult = await fetchCustomerAccount(getQuery, {}, accessToken);
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

      const updateResult = await fetchCustomerAccount(updateQuery, updateVariables, accessToken);

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

