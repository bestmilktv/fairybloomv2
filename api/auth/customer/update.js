/**
 * Customer Profile Update Endpoint
 * Updates customer profile information (firstName, lastName) using Customer Account API
 */

import { getAuthCookie } from '../../utils/cookies.js';

const SHOP_ID = process.env.VITE_SHOPIFY_SHOP_ID || process.env.SHOPIFY_SHOP_ID;
const CUSTOMER_ACCOUNT_URL = `https://shopify.com/${SHOP_ID}/account/customer/api/unstable/graphql`;

/**
 * Make authenticated request to Customer Account API
 * @param {string} query - GraphQL query
 * @param {object} variables - Query variables
 * @param {object} req - Request object to extract cookies
 */
async function fetchCustomerAccount(query, variables = {}, req = null) {
  // Build headers
  const headers = {
    'Content-Type': 'application/json',
  };

  // Shopify Customer Account API requires session cookies from shopify.com domain
  // These cookies are set during OAuth flow and contain authentication session
  // We must forward ALL cookies from the browser request to Shopify API
  if (req && req.headers.cookie) {
    headers['Cookie'] = req.headers.cookie;
    console.log('Forwarding cookies to Shopify API (length):', req.headers.cookie.length);
  } else {
    console.error('No cookies found in request headers');
    throw new Error('Authentication required - missing cookies');
  }

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

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authData = getAuthCookie(req);
    
    if (!authData || !authData.customer) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { firstName, lastName } = req.body;

    if (!firstName && !lastName) {
      return res.status(400).json({ error: 'At least firstName or lastName is required' });
    }

    // Build update input
    const updateInput = {};
    if (firstName) updateInput.firstName = firstName;
    if (lastName) updateInput.lastName = lastName;

    // Update customer profile
    const updateQuery = `
      mutation customerUpdate($input: CustomerUpdateInput!) {
        customerUpdate(input: $input) {
          customer {
            id
            firstName
            lastName
            email
          }
          userErrors {
            field
            message
          }
        }
      }
    `;

    const updateVariables = {
      input: updateInput
    };

    console.log('Updating customer profile with:', updateInput);
    console.log('Using cookies from request for authentication');

    const updateResult = await fetchCustomerAccount(updateQuery, updateVariables, req);

    // Check for GraphQL errors in response
    if (!updateResult.data || !updateResult.data.customerUpdate) {
      console.error('Invalid response from Shopify API:', updateResult);
      return res.status(500).json({ error: 'Neplatná odpověď z Shopify API.' });
    }

    if (updateResult.data.customerUpdate.userErrors && updateResult.data.customerUpdate.userErrors.length > 0) {
      const errorMessage = updateResult.data.customerUpdate.userErrors[0].message;
      console.error('Shopify userErrors:', updateResult.data.customerUpdate.userErrors);
      return res.status(400).json({ error: errorMessage || 'Aktualizace profilu se nezdařila.' });
    }

    const customer = updateResult.data.customerUpdate.customer;

    if (!customer) {
      console.error('No customer data in response:', updateResult);
      return res.status(500).json({ error: 'Aktualizace profilu se nezdařila - chybí data zákazníka.' });
    }

    console.log('Customer profile updated successfully:', customer);

    return res.status(200).json({
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName || '',
      lastName: customer.lastName || ''
    });
  } catch (error) {
    console.error('Customer update API error:', error);
    const errorMessage = error.message || 'Internal server error';
    
    // Return more specific error message to frontend
    if (errorMessage.includes('Authentication required')) {
      return res.status(401).json({ error: 'Nejste přihlášeni. Prosím přihlaste se znovu.' });
    }
    
    return res.status(500).json({ error: errorMessage.includes('GraphQL errors') ? errorMessage : 'Aktualizace profilu se nezdařila. Zkuste to prosím znovu.' });
  }
}
