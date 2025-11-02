/**
 * Customer Data Endpoint
 * Uses Shopify Storefront API (GraphQL) to fetch and update customer data
 */

import { getAuthCookie } from '../utils/cookies.js';

const API_VERSION = '2025-07';
const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || process.env.VITE_SHOPIFY_STORE_DOMAIN;

const STOREFRONT_API_URL = STORE_DOMAIN
  ? `https://${STORE_DOMAIN}/api/${API_VERSION}/graphql.json`
  : null;

const CUSTOMER_QUERY = `
  query getCustomer($customerAccessToken: String!) {
    customer(customerAccessToken: $customerAccessToken) {
      id
      firstName
      lastName
      email
      phone
      addresses(first: 10) {
        edges {
          node {
            id
            address1
            address2
            city
            province
            zip
            countryCodeV2
            phone
          }
        }
      }
    }
  }
`;

const CUSTOMER_UPDATE_MUTATION = `
  mutation customerUpdate($customerAccessToken: String!, $customer: CustomerUpdateInput!) {
    customerUpdate(customerAccessToken: $customerAccessToken, customer: $customer) {
      customer {
        id
        firstName
        lastName
        email
        phone
        addresses(first: 10) {
          edges {
            node {
              id
              address1
              address2
              city
              province
              zip
              countryCodeV2
              phone
            }
          }
        }
      }
      customerUserErrors {
        field
        message
      }
    }
  }
`;

async function callStorefrontAPI(query, variables) {
  if (!STOREFRONT_API_URL) {
    throw new Error('Storefront API URL not configured');
  }

  const response = await fetch(STOREFRONT_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  const responseText = await response.text();

  let payload;
  try {
    payload = JSON.parse(responseText);
  } catch (parseError) {
    throw new Error('Invalid response from Storefront API');
  }

  if (!response.ok) {
    throw new Error('Storefront API request failed');
  }

  if (payload.errors && payload.errors.length > 0) {
    const errorMessages = payload.errors.map((error) => error?.message || 'Unknown error').join(', ');
    throw new Error(`Storefront API errors: ${errorMessages}`);
  }

  return payload.data;
}

function mapCustomerResponse(customer) {
  if (!customer) {
    return null;
  }

  const addresses = customer.addresses?.edges || [];
  const defaultAddress = addresses.length > 0 ? addresses[0].node : null;

  return {
    id: customer.id,
    firstName: customer.firstName || '',
    lastName: customer.lastName || '',
    email: customer.email || '',
    phone: customer.phone || '',
    address: defaultAddress
      ? {
          id: defaultAddress.id,
          address1: defaultAddress.address1 || '',
          address2: defaultAddress.address2 || '',
          city: defaultAddress.city || '',
          province: defaultAddress.province || '',
          zip: defaultAddress.zip || '',
          countryCode: defaultAddress.countryCodeV2 || '',
          phone: defaultAddress.phone || '',
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
    input.email = payload.email;
    hasChanges = true;
  }
  if (payload.phone !== undefined) {
    input.phone = payload.phone;
    hasChanges = true;
  }

  return hasChanges ? input : null;
}

export default async function handler(req, res) {
  if (!STOREFRONT_API_URL) {
    return res.status(500).json({ error: 'Storefront API is not configured' });
  }

  const authData = getAuthCookie(req);

  if (!authData || !authData.access_token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const customerAccessToken = authData.access_token;

  if (req.method === 'GET') {
    try {
      const data = await callStorefrontAPI(CUSTOMER_QUERY, {
        customerAccessToken,
      });

      if (!data?.customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      const customer = mapCustomerResponse(data.customer);

      return res.status(200).json(customer);
    } catch (error) {
      return res.status(502).json({
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

      const data = await callStorefrontAPI(CUSTOMER_UPDATE_MUTATION, {
        customerAccessToken,
        customer: customerInput,
      });

      const userErrors = data?.customerUpdate?.customerUserErrors;
      if (userErrors && userErrors.length > 0) {
        return res.status(400).json({
          error: 'Unable to update customer',
          details: userErrors.map((err) => err.message),
        });
      }

      const updatedCustomer = mapCustomerResponse(data?.customerUpdate?.customer);

      if (!updatedCustomer) {
        return res.status(404).json({ error: 'Customer not found after update' });
      }

      return res.status(200).json(updatedCustomer);
    } catch (error) {
      return res.status(502).json({
        error: 'Failed to update customer data',
        details: error.message,
      });
    }
  }

  res.setHeader('Allow', 'GET,POST');
  return res.status(405).json({ error: 'Method not allowed' });
}
