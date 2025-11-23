/**
 * Customer Profile Update Endpoint
 * Handles both Customer Account API and Admin API updates
 * 
 * Routes:
 * POST /api/auth/customer/update - Uses Customer Account API (for firstName, lastName only)
 * POST /api/auth/customer/admin-update - Uses Admin API (for firstName, lastName, address, acceptsMarketing)
 */

import { getAuthCookie } from '../../utils/cookies.js';

const SHOP_ID = process.env.VITE_SHOPIFY_SHOP_ID || process.env.SHOPIFY_SHOP_ID;
const CUSTOMER_ACCOUNT_URL = `https://shopify.com/${SHOP_ID}/account/customer/api/unstable/graphql`;

const STORE_DOMAIN = process.env.VITE_SHOPIFY_STORE_DOMAIN || process.env.SHOPIFY_STORE_DOMAIN;
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;
const ADMIN_API_VERSION = '2024-04';

/**
 * Make authenticated request to Customer Account API
 */
async function fetchCustomerAccount(query, variables = {}, req = null) {
  const headers = {
    'Content-Type': 'application/json',
  };

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

/**
 * Handle update using Customer Account API (simple update - firstName, lastName only)
 */
async function handleCustomerAccountUpdate(req, res) {
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
    
    if (errorMessage.includes('Authentication required')) {
      return res.status(401).json({ error: 'Nejste přihlášeni. Prosím přihlaste se znovu.' });
    }
    
    return res.status(500).json({ error: errorMessage.includes('GraphQL errors') ? errorMessage : 'Aktualizace profilu se nezdařila. Zkuste to prosím znovu.' });
  }
}

/**
 * Handle update using Admin API (full update - firstName, lastName, address, acceptsMarketing)
 */
async function handleAdminUpdate(req, res) {
  try {
    // Verify authentication and get customer ID
    const authData = getAuthCookie(req);
    
    if (!authData || !authData.customer || !authData.customer.sub) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Validate Admin API credentials
    if (!STORE_DOMAIN || !ADMIN_TOKEN) {
      console.error('Missing Admin API configuration');
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const { firstName, lastName, address, acceptsMarketing } = req.body;

    // At least one field must be provided for update
    if (!firstName && !lastName && !address && acceptsMarketing === undefined) {
      return res.status(400).json({ error: 'At least one field is required for update' });
    }

    // Extract customer ID from OAuth JWT (sub field)
    const customerId = authData.customer.sub;
    const numericCustomerId = String(customerId);

    console.log('Updating customer profile via Admin API:', {
      originalCustomerId: customerId,
      numericCustomerId: numericCustomerId,
      updates: { firstName, lastName, hasAddress: !!address, acceptsMarketing }
    });

    // Fetch current customer data to get existing addresses
    const getCustomerResponse = await fetch(`https://${STORE_DOMAIN}/admin/api/${ADMIN_API_VERSION}/customers/${numericCustomerId}.json`, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': ADMIN_TOKEN,
        'Content-Type': 'application/json',
      },
    });
    
    let existingAddresses = [];
    if (getCustomerResponse.ok) {
      const currentData = await getCustomerResponse.json();
      existingAddresses = currentData.customer?.addresses || [];
    }

    // Build update payload for Admin API
    const updatePayload = {
      customer: {}
    };

    if (firstName) updatePayload.customer.first_name = firstName;
    if (lastName) updatePayload.customer.last_name = lastName;

    // Handle address update
    if (address) {
      let countryCode = 'CZ';
      if (address.country) {
        if (address.country === 'Czech Republic' || address.country === 'Czechia') {
          countryCode = 'CZ';
        } else if (address.country.length === 2) {
          countryCode = address.country.toUpperCase();
        } else {
          countryCode = address.country;
        }
      }

      const addressData = {
        address1: address.address1 || '',
        address2: address.address2 || '',
        city: address.city || '',
        province: address.province || '',
        zip: address.zip || '',
        country: address.country || 'Czech Republic',
        country_code: countryCode,
        phone: address.phone || ''
      };

      if (existingAddresses.length > 0) {
        addressData.id = existingAddresses[0].id;
        addressData.default = true;
        updatePayload.customer.addresses = [addressData];
      } else {
        addressData.default = true;
        updatePayload.customer.addresses = [addressData];
      }
    }

    // Handle email marketing consent
    if (acceptsMarketing !== undefined) {
      updatePayload.customer.accepts_marketing = acceptsMarketing;
      
      if (acceptsMarketing) {
        const consentTimestamp = new Date().toISOString();
        updatePayload.customer.email_marketing_consent = {
          state: 'subscribed',
          opt_in_level: 'single_opt_in',
          consent_updated_at: consentTimestamp
        };
      }
    }

    // Call Shopify Admin API
    const adminApiUrl = `https://${STORE_DOMAIN}/admin/api/${ADMIN_API_VERSION}/customers/${numericCustomerId}.json`;
    const adminResponse = await fetch(adminApiUrl, {
      method: 'PUT',
      headers: {
        'X-Shopify-Access-Token': ADMIN_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    });

    if (!adminResponse.ok) {
      const errorText = await adminResponse.text();
      console.error(`Shopify Admin API error: ${adminResponse.status}`, errorText);
      
      if (adminResponse.status === 401) {
        return res.status(401).json({ error: 'Invalid Admin API token' });
      }
      if (adminResponse.status === 404) {
        return res.status(404).json({ error: 'Customer not found' });
      }
      
      return res.status(adminResponse.status).json({ 
        error: `Shopify API error: ${adminResponse.statusText}` 
      });
    }

    const adminData = await adminResponse.json();

    if (!adminData.customer) {
      console.error('Invalid response from Shopify Admin API:', adminData);
      return res.status(500).json({ error: 'Neplatná odpověď z Shopify API.' });
    }

    const customer = adminData.customer;

    // Get default address
    let defaultAddress = null;
    if (customer.addresses && customer.addresses.length > 0) {
      defaultAddress = customer.addresses.find(addr => addr.default === true);
      if (!defaultAddress) {
        defaultAddress = customer.addresses[0];
      }
    } else if (customer.default_address) {
      defaultAddress = customer.default_address;
    }

    const addressResponse = defaultAddress ? {
      address1: defaultAddress.address1 || '',
      address2: defaultAddress.address2 || '',
      city: defaultAddress.city || '',
      province: defaultAddress.province || '',
      zip: defaultAddress.zip || '',
      country: defaultAddress.country || '',
      phone: defaultAddress.phone || ''
    } : undefined;

    const acceptsMarketingResponse = customer.email_marketing_consent?.state === 'subscribed' || 
                                     customer.accepts_marketing === true;

    console.log('Customer profile updated successfully via Admin API:', {
      id: customer.id,
      firstName: customer.first_name,
      lastName: customer.last_name,
      hasAddress: !!defaultAddress,
      acceptsMarketing: acceptsMarketingResponse
    });

    return res.status(200).json({
      id: customer.id.toString(),
      email: customer.email,
      firstName: customer.first_name || '',
      lastName: customer.last_name || '',
      address: addressResponse,
      acceptsMarketing: acceptsMarketingResponse
    });
  } catch (error) {
    console.error('Customer update API error:', error);
    const errorMessage = error.message || 'Internal server error';
    
    return res.status(500).json({ 
      error: errorMessage.includes('Shopify API') ? errorMessage : 'Aktualizace profilu se nezdařila. Zkuste to prosím znovu.' 
    });
  }
}

/**
 * Main handler - routes to appropriate function based on URL
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check URL to determine which API to use
  const url = req.url || '';
  
  // If URL contains /admin-update, use Admin API
  if (url.includes('/admin-update')) {
    return handleAdminUpdate(req, res);
  }
  
  // Otherwise, use Customer Account API
  return handleCustomerAccountUpdate(req, res);
}
