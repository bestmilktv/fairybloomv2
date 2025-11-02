/**
 * Customer Data Endpoint
 * Uses Shopify Customer Account API (GraphQL) to fetch and update customer data
 */

import { getAuthCookie } from '../utils/cookies.js';

const SHOP_ID = process.env.SHOPIFY_SHOP_ID || process.env.VITE_SHOPIFY_SHOP_ID;
const CUSTOMER_ACCOUNT_URL = `https://shopify.com/${SHOP_ID}/account/customer/api/unstable/graphql`;

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

  const headers = {
    'Content-Type': 'application/json',
    'Shopify-Customer-Access-Token': accessToken,
  };

  const response = await fetch(CUSTOMER_ACCOUNT_URL, {
    method: 'POST',
    headers,
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
    throw new Error('Invalid response from Customer Account API');
  }

  if (!response.ok) {
    throw new Error('Customer Account API request failed');
  }

  if (payload.errors && payload.errors.length > 0) {
    const errorMessages = payload.errors.map((error) => error?.message || 'Unknown error').join(', ');
    throw new Error(`Customer Account API errors: ${errorMessages}`);
  }

  return payload.data;
}

function mapCustomerResponse(customer) {
  if (!customer) {
    return null;
  }

  const email = customer.emailAddress?.emailAddress || '';
  const phone = customer.phoneNumber?.phoneNumber || '';
  const defaultAddress = customer.defaultAddress;
  const addresses = customer.addresses?.edges || [];
  const primaryAddress = defaultAddress || (addresses.length > 0 ? addresses[0].node : null);

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

  const authData = getAuthCookie(req);

  if (!authData || !authData.access_token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const customerAccessToken = authData.access_token;

  if (req.method === 'GET') {
    try {
      const data = await callCustomerAccountAPI(CUSTOMER_QUERY, {}, customerAccessToken);

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

      const data = await callCustomerAccountAPI(CUSTOMER_UPDATE_MUTATION, {
        customer: customerInput,
      }, customerAccessToken);

      const userErrors = data?.customerUpdate?.userErrors;
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
