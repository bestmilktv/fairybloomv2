/**
 * Customer Data Endpoint
 * Uses Shopify Customer Account API (GraphQL) to fetch and update customer data
 */

import { getAuthCookie } from '../utils/cookies.js';

const SHOP_ID = process.env.SHOPIFY_SHOP_ID || process.env.VITE_SHOPIFY_SHOP_ID;
const CUSTOMER_ACCOUNT_URL = `https://shopify.com/${SHOP_ID}/account/customer/api/unstable/graphql`;

// DEBUG: Log configuration on module load
if (typeof SHOP_ID !== 'undefined') {
  console.log('[Customer API] Module loaded - SHOP_ID configured:', !!SHOP_ID);
  console.log('[Customer API] SHOP_ID value:', SHOP_ID ? 'SET (length: ' + String(SHOP_ID).length + ')' : 'NOT SET');
  console.log('[Customer API] CUSTOMER_ACCOUNT_URL:', CUSTOMER_ACCOUNT_URL);
}

const CUSTOMER_QUERY = `
  query {
    customer {
      id
      firstName
      lastName
      emailAddress {
        emailAddress
      }
      phoneNumber {
        phoneNumber
      }
      defaultAddress {
        id
        address1
        address2
        city
        province
        zip
        countryCode
        phoneNumber {
          phoneNumber
        }
      }
      addresses(first: 10) {
        edges {
          node {
            id
            address1
            address2
            city
            province
            zip
            countryCode
            phoneNumber {
              phoneNumber
            }
          }
        }
      }
    }
  }
`;

const CUSTOMER_UPDATE_MUTATION = `
  mutation customerUpdate($customer: CustomerUpdateInput!) {
    customerUpdate(customer: $customer) {
      customer {
        id
        firstName
        lastName
        emailAddress {
          emailAddress
        }
        phoneNumber {
          phoneNumber
        }
        defaultAddress {
          id
          address1
          address2
          city
          province
          zip
          countryCode
          phoneNumber {
            phoneNumber
          }
        }
        addresses(first: 10) {
          edges {
            node {
              id
              address1
              address2
              city
              province
              zip
              countryCode
              phoneNumber {
                phoneNumber
              }
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

async function callCustomerAccountAPI(query, variables, accessToken) {
  if (!SHOP_ID) {
    throw new Error('Shopify Shop ID not configured');
  }

  if (!accessToken || typeof accessToken !== 'string') {
    throw new Error('Authentication required - missing customer access token');
  }

  const tokenPreview = `${accessToken.slice(0, 6)}...${accessToken.slice(-4)}`;
  console.log('[Customer API] Using customer access token:', tokenPreview, '(length:', accessToken.length, ')');
  console.log('[Customer API] Token type:', accessToken.startsWith('shcat_') ? 'shcat_ (Customer Account)' : 'unknown format');

  const headers = {
    'Content-Type': 'application/json',
    'Shopify-Customer-Access-Token': accessToken,
  };

  // DEBUG: Log headers being sent (without token value)
  console.log('[Customer API] Request headers:', {
    'Content-Type': headers['Content-Type'],
    'Shopify-Customer-Access-Token': 'present (' + accessToken.length + ' chars)',
    'Token starts with': accessToken.substring(0, 10)
  });
  
  // DEBUG: Log URL being called
  console.log('[Customer API] Calling URL:', CUSTOMER_ACCOUNT_URL);

  const response = await fetch(CUSTOMER_ACCOUNT_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  console.log('[Customer API] Customer Account API status:', response.status, response.statusText);
  const responseText = await response.text();
  
  let payload;
  try {
    payload = JSON.parse(responseText);
  } catch (parseError) {
    console.error('[Customer API] Failed to parse Customer Account API JSON:', parseError);
    console.error('[Customer API] Raw response text (first 200 chars):', responseText.substring(0, 200));
    throw new Error('Invalid response from Customer Account API');
  }

  if (!response.ok) {
    console.error(`[Customer API] Shopify Customer Account API error: ${response.status}`);
    if (payload.errors && payload.errors.length > 0) {
      const errorMessages = payload.errors.map((error) => error?.message || 'Unknown error').join(', ');
      console.error('[Customer API] GraphQL errors from Shopify:', errorMessages);
    }
    
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  if (payload.errors && payload.errors.length > 0) {
    const errorMessages = payload.errors.map((error) => error?.message || 'Unknown error').join(', ');
    console.error('[Customer API] GraphQL errors from Shopify:', errorMessages);
    throw new Error(`GraphQL errors: ${errorMessages}`);
  }

  return payload;
}

function mapCustomerResponse(customer) {
  if (!customer || typeof customer !== 'object') {
    return null;
  }

  const email = customer.emailAddress?.emailAddress || '';
  const phone = customer.phoneNumber?.phoneNumber || '';
  const defaultAddress = customer.defaultAddress;
  const addresses = customer.addresses?.edges || [];
  const primaryAddress = defaultAddress || (addresses.length > 0 && addresses[0]?.node ? addresses[0].node : null);

  return {
    id: customer.id || '',
    firstName: customer.firstName || '',
    lastName: customer.lastName || '',
    email: email,
    phone: phone,
    address: primaryAddress
      ? {
          id: primaryAddress.id || '',
          address1: primaryAddress.address1 || '',
          address2: primaryAddress.address2 || '',
          city: primaryAddress.city || '',
          province: primaryAddress.province || '',
          zip: primaryAddress.zip || '',
          countryCode: primaryAddress.countryCode || '',
          phone: primaryAddress.phoneNumber?.phoneNumber || '',
        }
      : null,
  };
}

function buildCustomerInput(payload = {}) {
  const input = {};
  let hasChanges = false;

  if (payload.firstName !== undefined) {
    input.firstName = payload.firstName;
    hasChanges = true;
  }
  if (payload.lastName !== undefined) {
    input.lastName = payload.lastName;
    hasChanges = true;
  }
  if (payload.email !== undefined) {
    input.emailAddress = { emailAddress: payload.email };
    hasChanges = true;
  }
  if (payload.phone !== undefined) {
    input.phoneNumber = { phoneNumber: payload.phone };
    hasChanges = true;
  }

  return hasChanges ? input : null;
}

export default async function handler(req, res) {
  if (!SHOP_ID) {
    return res.status(500).json({ error: 'Shopify Shop ID is not configured' });
  }

  // DEBUG: Log cookie debugging
  const hasCookies = !!req.headers.cookie;
  console.log('[Customer API] Request has cookies header:', hasCookies);
  
  if (hasCookies) {
    const cookieHeader = req.headers.cookie || '';
    const hasShopifyToken = cookieHeader.includes('shopify_access_token');
    console.log('[Customer API] shopify_access_token cookie present:', hasShopifyToken);
    
    if (hasShopifyToken) {
      const tokenMatch = cookieHeader.match(/shopify_access_token=([^;]+)/);
      if (tokenMatch) {
        console.log('[Customer API] Cookie value found (length):', tokenMatch[1]?.length || 0);
      }
    }
  }

  const authData = getAuthCookie(req);
  console.log('[Customer API] getAuthCookie returned:', authData ? 'data exists' : 'null');
  
  if (authData) {
    const hasAccessToken = !!authData.access_token;
    const tokenPreview = authData.access_token ? `${authData.access_token.slice(0, 10)}...${authData.access_token.slice(-6)}` : 'none';
    console.log('[Customer API] authData.access_token exists:', hasAccessToken, 'preview:', tokenPreview);
    console.log('[Customer API] token type:', authData.access_token?.startsWith('shcat_') ? 'shcat_ (Customer Account)' : 'unknown');
    
    if (authData.expires_at) {
      const expiresDate = new Date(authData.expires_at);
      const now = new Date();
      const isExpired = expiresDate < now;
      const timeUntilExpiry = expiresDate.getTime() - now.getTime();
      console.log('[Customer API] Token expires_at:', authData.expires_at, 'isExpired:', isExpired, 'ms until expiry:', timeUntilExpiry);
    }
  }

  if (!authData || !authData.access_token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const customerAccessToken = authData.access_token;

  if (req.method === 'GET') {
    try {
      const result = await callCustomerAccountAPI(CUSTOMER_QUERY, {}, customerAccessToken);

      if (!result || !result.data || !result.data.customer) {
        console.warn('[Customer API] No customer data in response');
        return res.status(404).json({ error: 'Customer not found' });
      }

      const customer = mapCustomerResponse(result.data.customer);

      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      return res.status(200).json(customer);
    } catch (error) {
      console.error('[Customer API] GET failed:', error.message);
      
      let statusCode = 502;
      if (error.message.includes('Authentication required')) {
        statusCode = 401;
      } else if (error.message.includes('HTTP error')) {
        statusCode = 502;
      }
      
      return res.status(statusCode).json({
        error: 'Failed to fetch customer data',
        details: error.message,
      });
    }
  }

  if (req.method === 'POST') {
    try {
      let parsedBody = req.body;
      if (typeof parsedBody === 'string') {
        try {
          parsedBody = JSON.parse(parsedBody);
        } catch (parseError) {
          return res.status(400).json({ error: 'Invalid JSON payload' });
        }
      }

      const body = parsedBody && typeof parsedBody === 'object' ? parsedBody : {};
      const customerInput = buildCustomerInput(body);

      if (!customerInput) {
        return res.status(400).json({ error: 'No customer updates provided' });
      }

      const result = await callCustomerAccountAPI(CUSTOMER_UPDATE_MUTATION, {
        customer: customerInput,
      }, customerAccessToken);

      if (!result || !result.data || !result.data.customerUpdate) {
        console.error('[Customer API] Invalid response from customerUpdate mutation');
        return res.status(500).json({ error: 'Invalid response from Shopify API' });
      }

      const userErrors = result.data.customerUpdate.userErrors;
      if (userErrors && userErrors.length > 0) {
        const errorMessages = userErrors.map((err) => err.message);
        console.error('[Customer API] customerUpdate userErrors:', errorMessages);
        return res.status(400).json({
          error: 'Unable to update customer',
          details: errorMessages,
        });
      }

      const updatedCustomer = mapCustomerResponse(result.data.customerUpdate.customer);

      if (!updatedCustomer) {
        return res.status(404).json({ error: 'Customer not found after update' });
      }

      return res.status(200).json(updatedCustomer);
    } catch (error) {
      console.error('[Customer API] POST failed:', error.message);
      
      let statusCode = 502;
      if (error.message.includes('Authentication required')) {
        statusCode = 401;
      } else if (error.message.includes('GraphQL errors')) {
        statusCode = 400;
      }
      
      return res.status(statusCode).json({
        error: 'Failed to update customer data',
        details: error.message,
      });
    }
  }

  res.setHeader('Allow', 'GET,POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
