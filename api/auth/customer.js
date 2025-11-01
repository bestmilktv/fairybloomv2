/**
 * Customer Data Endpoint
 * Fetches current customer profile data from Shopify Admin API
 * Uses customer ID from JWT cookie to fetch latest data from Shopify
 */

import { getAuthCookie } from '../utils/cookies.js';

const STORE_DOMAIN = process.env.VITE_SHOPIFY_STORE_DOMAIN || process.env.SHOPIFY_STORE_DOMAIN;
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;
const ADMIN_API_VERSION = '2024-04'; // Use same version as other endpoints

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

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

    // Extract customer ID from OAuth JWT (sub field)
    // Format from OAuth is always numeric ID (e.g., 23325479567704 as number)
    const customerId = authData.customer.sub;
    const numericCustomerId = String(customerId);

    // Fetch current customer data from Shopify Admin API
    const adminApiUrl = `https://${STORE_DOMAIN}/admin/api/${ADMIN_API_VERSION}/customers/${numericCustomerId}.json`;
    
    console.log('Fetching customer from Shopify Admin API:', {
      url: adminApiUrl,
      customerId: numericCustomerId,
      storeDomain: STORE_DOMAIN
    });
    
    const adminResponse = await fetch(adminApiUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': ADMIN_TOKEN,
        'Content-Type': 'application/json',
      },
    });

    if (!adminResponse.ok) {
      const errorText = await adminResponse.text();
      console.error(`Shopify Admin API error: ${adminResponse.status}`, errorText);
      
      if (adminResponse.status === 401) {
        return res.status(401).json({ error: 'Invalid Admin API token' });
      }
      if (adminResponse.status === 404) {
        console.error('Customer not found in Shopify Admin API, customerId:', numericCustomerId);
        return res.status(404).json({ error: 'Customer not found' });
      }
      
      // Don't fallback - return error instead
      return res.status(adminResponse.status).json({ 
        error: `Shopify API error: ${adminResponse.statusText}` 
      });
    }

    const adminData = await adminResponse.json();

    if (!adminData.customer) {
      console.error('Invalid response from Shopify Admin API - no customer object:', JSON.stringify(adminData, null, 2));
      return res.status(500).json({ error: 'Invalid response from Shopify API' });
    }

    const customer = adminData.customer;

    console.log('Raw customer data from Shopify Admin API:', JSON.stringify({
      id: customer.id,
      email: customer.email,
      first_name: customer.first_name,
      last_name: customer.last_name,
      addresses_count: customer.addresses ? customer.addresses.length : 0,
      addresses: customer.addresses ? customer.addresses.map(addr => ({
        id: addr.id,
        address1: addr.address1,
        city: addr.city,
        zip: addr.zip,
        country: addr.country
      })) : null
    }, null, 2));

    // Get default address (first address or null)
    // Shopify Admin API returns addresses in customer.addresses array
    // We should also check customer.default_address as fallback
    let defaultAddress = null;
    
    if (customer.default_address) {
      defaultAddress = customer.default_address;
      console.log('Using default_address from customer object');
    } else if (customer.addresses && customer.addresses.length > 0) {
      defaultAddress = customer.addresses[0];
      console.log('Using first address from addresses array');
    }

    console.log('Default address:', JSON.stringify(defaultAddress, null, 2));

    // Extract address data - include if it exists, even if some fields are missing
    // We'll let the frontend decide if it's complete or not
    const address = defaultAddress ? {
      address1: defaultAddress.address1 || '',
      address2: defaultAddress.address2 || '',
      city: defaultAddress.city || '',
      province: defaultAddress.province || '',
      zip: defaultAddress.zip || '',
      country: defaultAddress.country || '',
      phone: defaultAddress.phone || ''
    } : undefined;

    // Check email marketing consent
    const acceptsMarketing = customer.email_marketing_consent?.state === 'subscribed' || 
                             customer.accepts_marketing === true;

    const responseData = {
      id: customer.id.toString(),
      email: customer.email || '',
      firstName: customer.first_name || '',
      lastName: customer.last_name || '',
      address: address,
      acceptsMarketing: acceptsMarketing
    };

    console.log('Customer data from Shopify Admin API (response):', JSON.stringify({
      id: responseData.id,
      email: responseData.email,
      firstName: responseData.firstName,
      lastName: responseData.lastName,
      hasAddress: !!responseData.address,
      addressFields: responseData.address ? {
        address1: responseData.address.address1,
        city: responseData.address.city,
        zip: responseData.address.zip,
        country: responseData.address.country
      } : null,
      acceptsMarketing: responseData.acceptsMarketing
    }, null, 2));

    // Return current data from Admin API
    return res.status(200).json(responseData);
  } catch (error) {
    console.error('Customer API error:', error);
    
    // Fallback to JWT data if there's an error
    try {
      const authData = getAuthCookie(req);
      if (authData && authData.customer) {
        return res.status(200).json({
          id: authData.customer.sub,
          email: authData.customer.email || '',
          firstName: authData.customer.firstName || '',
          lastName: authData.customer.lastName || '',
          address: undefined,
          acceptsMarketing: undefined
        });
      }
    } catch (fallbackError) {
      console.error('Fallback to JWT also failed:', fallbackError);
    }
    
    return res.status(500).json({ error: 'Internal server error' });
  }
}
