/**
 * Customer Profile Update Endpoint
 * Updates customer profile information (firstName, lastName) using Customer Account API
 */

import { getAuthCookie } from '../../utils/cookies.js';

const SHOP_ID = process.env.VITE_SHOPIFY_SHOP_ID || process.env.SHOPIFY_SHOP_ID;
const CUSTOMER_ACCOUNT_URL = `https://shopify.com/${SHOP_ID}/account/customer/api/unstable/graphql`;

/**
 * Make authenticated request to Customer Account API
 */
async function fetchCustomerAccount(query, variables = {}) {
  const response = await fetch(CUSTOMER_ACCOUNT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  if (data.errors && data.errors.length > 0) {
    const errorMessages = data.errors.map((error) => error.message).join(', ');
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

    const updateResult = await fetchCustomerAccount(updateQuery, updateVariables);

    if (updateResult.data.customerUpdate.userErrors.length > 0) {
      const errorMessage = updateResult.data.customerUpdate.userErrors[0].message;
      return res.status(400).json({ error: errorMessage });
    }

    const customer = updateResult.data.customerUpdate.customer;

    return res.status(200).json({
      id: customer.id,
      email: customer.email,
      firstName: customer.firstName,
      lastName: customer.lastName
    });
  } catch (error) {
    console.error('Customer update API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
