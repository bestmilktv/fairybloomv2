import { getAuthCookie } from './utils/cookies.js';

const ADMIN_API_VERSION = '2025-07';
const STORE_DOMAIN = process.env.SHOPIFY_STORE_DOMAIN || process.env.VITE_SHOPIFY_STORE_DOMAIN;
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;

const ADMIN_GRAPHQL_URL = STORE_DOMAIN
  ? `https://${STORE_DOMAIN}/admin/api/${ADMIN_API_VERSION}/graphql.json`
  : null;

const CUSTOMER_SELECTION_SET = `
  id
  firstName
  lastName
  email
  phone
  defaultAddress {
    id
    address1
    address2
    city
    province
    zip
    countryCodeV2
    phone
  }
`;

const GET_CUSTOMER_QUERY = `
  query getCustomer($id: ID!) {
    customer(id: $id) {
      ${CUSTOMER_SELECTION_SET}
    }
  }
`;

const CUSTOMER_UPDATE_MUTATION = `
  mutation customerUpdate($input: CustomerInput!) {
    customerUpdate(input: $input) {
      customer {
        ${CUSTOMER_SELECTION_SET}
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const CUSTOMER_ADDRESS_UPSERT_MUTATION = `
  mutation customerAddressUpsert($customerId: ID!, $address: MailingAddressInput!) {
    customerAddressUpsert(customerId: $customerId, address: $address) {
      customerAddress {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const CUSTOMER_DEFAULT_ADDRESS_MUTATION = `
  mutation customerDefaultAddressUpdate($customerId: ID!, $addressId: ID!) {
    customerDefaultAddressUpdate(customerId: $customerId, addressId: $addressId) {
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

function sanitizeGraphQLErrors(errors) {
  if (!Array.isArray(errors)) {
    return [];
  }

  return errors.map((error) => ({
    message: error?.message,
    code: error?.extensions?.code,
  }));
}

async function callShopifyAdmin(query, variables, actionLabel = 'request') {
  if (!ADMIN_GRAPHQL_URL || !ADMIN_TOKEN) {
    throw new Error('Shopify Admin API not configured');
  }

  const response = await fetch(ADMIN_GRAPHQL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': ADMIN_TOKEN,
    },
    body: JSON.stringify({ query, variables }),
  });

  const responseText = await response.text();

  let payload;
  try {
    payload = JSON.parse(responseText);
  } catch (parseError) {
    console.error(`[Shopify Admin API] ${actionLabel} parse error`, parseError);
    throw new Error('Invalid response from Shopify Admin API');
  }

  if (!response.ok) {
    console.error(`[Shopify Admin API] ${actionLabel} HTTP error`, response.status);
    throw new Error('Shopify Admin API request failed');
  }

  if (payload.errors && payload.errors.length > 0) {
    console.error(`[Shopify Admin API] ${actionLabel} GraphQL errors`, sanitizeGraphQLErrors(payload.errors));
    throw new Error('Shopify Admin API returned errors');
  }

  return payload.data;
}

function buildCustomerGid(customerId) {
  if (!customerId) {
    return null;
  }

  const idString = String(customerId);
  return idString.startsWith('gid://') ? idString : `gid://shopify/Customer/${idString}`;
}

function mapCustomerResponse(customer) {
  if (!customer) {
    return null;
  }

  const defaultAddress = customer.defaultAddress;

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

async function fetchCustomer(customerGid) {
  const data = await callShopifyAdmin(GET_CUSTOMER_QUERY, { id: customerGid }, 'customerFetch');
  return mapCustomerResponse(data?.customer);
}

function buildCustomerInput(customerGid, payload = {}) {
  const input = { id: customerGid };
  let hasChanges = false;

  ['firstName', 'lastName', 'email', 'phone'].forEach((field) => {
    if (Object.prototype.hasOwnProperty.call(payload, field)) {
      input[field] = payload[field];
      hasChanges = true;
    }
  });

  return hasChanges ? input : null;
}

function buildAddressInput(address = {}) {
  if (!address || typeof address !== 'object') {
    return null;
  }

  const allowedKeys = new Set([
    'id',
    'address1',
    'address2',
    'city',
    'province',
    'zip',
    'country',
    'countryCode',
    'phone',
    'firstName',
    'lastName',
    'company',
  ]);

  const result = {};

  Object.entries(address).forEach(([key, value]) => {
    if (!allowedKeys.has(key)) {
      return;
    }

    if (value === undefined || value === null) {
      return;
    }

    if (key === 'countryCode') {
      result.country = value;
      return;
    }

    result[key] = value;
  });

  if (result.country === undefined && address.country) {
    result.country = address.country;
  }

  return Object.keys(result).length > 0 ? result : null;
}

export default async function handler(req, res) {
  if (!ADMIN_GRAPHQL_URL || !ADMIN_TOKEN) {
    return res.status(500).json({ error: 'Shopify Admin API is not configured' });
  }

  const authData = getAuthCookie(req);

  if (!authData || !authData.access_token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const customerId = authData?.customer?.sub;
  const customerGid = buildCustomerGid(customerId);

  if (!customerGid) {
    return res.status(400).json({ error: 'Missing customer identifier' });
  }

  if (req.method === 'GET') {
    try {
      const customer = await fetchCustomer(customerGid);

      if (!customer) {
        return res.status(404).json({ error: 'Customer not found' });
      }

      return res.status(200).json({ customer });
    } catch (error) {
      console.error('[Customer Endpoint] GET failed', error);
      return res.status(502).json({ error: 'Failed to fetch customer data' });
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

      const customerInput = buildCustomerInput(customerGid, body);
      const addressInput = buildAddressInput(body.address);
      const setAddressAsDefault = body?.address?.setAsDefault ?? !body?.address?.id;

      if (!customerInput && !addressInput) {
        return res.status(400).json({ error: 'No customer updates provided' });
      }

      if (customerInput) {
        const updateResult = await callShopifyAdmin(
          CUSTOMER_UPDATE_MUTATION,
          { input: customerInput },
          'customerUpdate',
        );

        const userErrors = updateResult?.customerUpdate?.userErrors;
        if (userErrors && userErrors.length > 0) {
          console.warn('[Customer Endpoint] customerUpdate user errors', userErrors.map((err) => err.message));
          return res.status(400).json({
            error: 'Unable to update customer profile',
            details: userErrors.map((err) => err.message),
          });
        }
      }

      const warnings = [];

      if (addressInput) {
        const upsertResult = await callShopifyAdmin(
          CUSTOMER_ADDRESS_UPSERT_MUTATION,
          { customerId: customerGid, address: addressInput },
          'customerAddressUpsert',
        );

        const addressErrors = upsertResult?.customerAddressUpsert?.userErrors;
        if (addressErrors && addressErrors.length > 0) {
          console.warn('[Customer Endpoint] customerAddressUpsert user errors', addressErrors.map((err) => err.message));
          return res.status(400).json({
            error: 'Unable to update address',
            details: addressErrors.map((err) => err.message),
          });
        }

        const addressId = upsertResult?.customerAddressUpsert?.customerAddress?.id;

        if (setAddressAsDefault && addressId) {
          const defaultResult = await callShopifyAdmin(
            CUSTOMER_DEFAULT_ADDRESS_MUTATION,
            { customerId: customerGid, addressId },
            'customerDefaultAddressUpdate',
          );

          const defaultErrors = defaultResult?.customerDefaultAddressUpdate?.userErrors;
          if (defaultErrors && defaultErrors.length > 0) {
            const messages = defaultErrors.map((err) => err.message);
            console.warn('[Customer Endpoint] customerDefaultAddressUpdate user errors', messages);
            messages.forEach((message) => warnings.push(message));
          }
        }
      }

      const customer = await fetchCustomer(customerGid);

      return res.status(200).json(
        warnings.length > 0
          ? { customer, warnings }
          : { customer },
      );
    } catch (error) {
      console.error('[Customer Endpoint] POST failed', error);
      return res.status(502).json({ error: 'Failed to update customer data' });
    }
  }

  res.setHeader('Allow', 'GET,POST');
  return res.status(405).json({ error: 'Method not allowed' });
}

