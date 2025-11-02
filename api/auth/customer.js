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

const CUSTOMER_ADDRESS_CREATE_MUTATION = `
  mutation customerAddressCreate($address: MailingAddressInput!, $addressListId: ID) {
    customerAddressCreate(address: $address, addressListId: $addressListId) {
      customerAddress {
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
      userErrors {
        field
        message
      }
    }
  }
`;

const CUSTOMER_ADDRESS_UPDATE_MUTATION = `
  mutation customerAddressUpdate($address: MailingAddressInput!, $id: ID!) {
    customerAddressUpdate(address: $address, id: $id) {
      customerAddress {
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
      userErrors {
        field
        message
      }
    }
  }
`;

const CUSTOMER_DEFAULT_ADDRESS_UPDATE_MUTATION = `
  mutation customerDefaultAddressUpdate($addressId: ID!) {
    customerDefaultAddressUpdate(addressId: $addressId) {
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
          country: primaryAddress.countryCode || '', // Map countryCode to country for frontend
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

function buildAddressInput(address = {}) {
  if (!address || typeof address !== 'object') {
    return null;
  }

  // Customer Account API expects MailingAddressInput format
  const input = {};
  let hasFields = false;

  if (address.address1 !== undefined) {
    input.address1 = address.address1;
    hasFields = true;
  }
  if (address.address2 !== undefined) {
    input.address2 = address.address2;
    hasFields = true;
  }
  if (address.city !== undefined) {
    input.city = address.city;
    hasFields = true;
  }
  if (address.province !== undefined) {
    input.province = address.province;
    hasFields = true;
  }
  if (address.zip !== undefined) {
    input.zip = address.zip;
    hasFields = true;
  }
  if (address.country !== undefined || address.countryCode !== undefined) {
    // Customer Account API expects countryCode (e.g., "CZ")
    const countryCode = address.countryCode || (address.country && address.country.length === 2 ? address.country.toUpperCase() : address.country);
    if (countryCode) {
      input.countryCode = countryCode;
      hasFields = true;
    }
  }
  if (address.phone !== undefined) {
    input.phoneNumber = { phoneNumber: address.phone };
    hasFields = true;
  }
  if (address.firstName !== undefined) {
    input.firstName = address.firstName;
    hasFields = true;
  }
  if (address.lastName !== undefined) {
    input.lastName = address.lastName;
    hasFields = true;
  }

  return hasFields ? input : null;
}

export default async function handler(req, res) {
  if (!SHOP_ID) {
    return res.status(500).json({ error: 'Shopify Shop ID is not configured' });
  }

  // Get token from cookie (primary and only method)
  const authData = getAuthCookie(req);
  
  if (!authData || !authData.access_token) {
    console.log('[Customer API] No valid authentication cookie found');
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const customerAccessToken = authData.access_token;
  console.log('[Customer API] Using token from cookie, preview:', `${customerAccessToken.slice(0, 10)}...${customerAccessToken.slice(-6)}`);

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
      const addressInput = buildAddressInput(body.address);

      if (!customerInput && !addressInput) {
        return res.status(400).json({ error: 'No customer updates provided' });
      }

      // First, get current customer data to check existing addresses
      const currentCustomerResult = await callCustomerAccountAPI(CUSTOMER_QUERY, {}, customerAccessToken);
      const currentCustomer = currentCustomerResult?.data?.customer;
      const existingAddressId = currentCustomer?.defaultAddress?.id || 
                               (currentCustomer?.addresses?.edges?.[0]?.node?.id);

      // Update customer fields (firstName, lastName, email, phone)
      if (customerInput) {
        const customerUpdateResult = await callCustomerAccountAPI(CUSTOMER_UPDATE_MUTATION, {
          customer: customerInput,
        }, customerAccessToken);

        if (!customerUpdateResult || !customerUpdateResult.data || !customerUpdateResult.data.customerUpdate) {
          console.error('[Customer API] Invalid response from customerUpdate mutation');
          return res.status(500).json({ error: 'Invalid response from Shopify API' });
        }

        const userErrors = customerUpdateResult.data.customerUpdate.userErrors;
        if (userErrors && userErrors.length > 0) {
          const errorMessages = userErrors.map((err) => err.message);
          console.error('[Customer API] customerUpdate userErrors:', errorMessages);
          return res.status(400).json({
            error: 'Unable to update customer',
            details: errorMessages,
          });
        }
      }

      // Update or create address
      let addressId = existingAddressId;
      if (addressInput) {
        if (existingAddressId) {
          // Update existing address
          const addressUpdateResult = await callCustomerAccountAPI(CUSTOMER_ADDRESS_UPDATE_MUTATION, {
            address: addressInput,
            id: existingAddressId,
          }, customerAccessToken);

          if (!addressUpdateResult || !addressUpdateResult.data || !addressUpdateResult.data.customerAddressUpdate) {
            console.error('[Customer API] Invalid response from customerAddressUpdate mutation');
            return res.status(500).json({ error: 'Invalid response from Shopify API' });
          }

          const addressErrors = addressUpdateResult.data.customerAddressUpdate.userErrors;
          if (addressErrors && addressErrors.length > 0) {
            const errorMessages = addressErrors.map((err) => err.message);
            console.error('[Customer API] customerAddressUpdate userErrors:', errorMessages);
            return res.status(400).json({
              error: 'Unable to update address',
              details: errorMessages,
            });
          }

          addressId = addressUpdateResult.data.customerAddressUpdate.customerAddress?.id || existingAddressId;
        } else {
          // Create new address
          const addressCreateResult = await callCustomerAccountAPI(CUSTOMER_ADDRESS_CREATE_MUTATION, {
            address: addressInput,
          }, customerAccessToken);

          if (!addressCreateResult || !addressCreateResult.data || !addressCreateResult.data.customerAddressCreate) {
            console.error('[Customer API] Invalid response from customerAddressCreate mutation');
            return res.status(500).json({ error: 'Invalid response from Shopify API' });
          }

          const addressErrors = addressCreateResult.data.customerAddressCreate.userErrors;
          if (addressErrors && addressErrors.length > 0) {
            const errorMessages = addressErrors.map((err) => err.message);
            console.error('[Customer API] customerAddressCreate userErrors:', errorMessages);
            return res.status(400).json({
              error: 'Unable to create address',
              details: errorMessages,
            });
          }

          addressId = addressCreateResult.data.customerAddressCreate.customerAddress?.id;
        }

        // Set as default address if addressId exists
        if (addressId) {
          const defaultResult = await callCustomerAccountAPI(CUSTOMER_DEFAULT_ADDRESS_UPDATE_MUTATION, {
            addressId: addressId,
          }, customerAccessToken);

          const defaultErrors = defaultResult?.data?.customerDefaultAddressUpdate?.userErrors;
          if (defaultErrors && defaultErrors.length > 0) {
            console.warn('[Customer API] customerDefaultAddressUpdate userErrors:', defaultErrors.map((err) => err.message));
            // Don't fail if setting default fails, just log warning
          }
        }
      }

      // Fetch updated customer data
      const updatedResult = await callCustomerAccountAPI(CUSTOMER_QUERY, {}, customerAccessToken);
      const updatedCustomer = mapCustomerResponse(updatedResult?.data?.customer);

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
