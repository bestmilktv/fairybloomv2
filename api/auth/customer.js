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

    console.log('Shopify Admin API response status:', adminResponse.status, adminResponse.statusText);

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
    console.log('Raw adminData response from Shopify:', JSON.stringify(adminData, null, 2));

    if (!adminData.customer) {
      console.error('Invalid response from Shopify Admin API - no customer object:', JSON.stringify(adminData, null, 2));
      return res.status(500).json({ error: 'Invalid response from Shopify API' });
    }

    const customer = adminData.customer;

    // Log the FULL customer object to see what Shopify actually returns
    console.log('FULL customer object from Shopify Admin API:', JSON.stringify(customer, null, 2));

    console.log('Raw customer data from Shopify Admin API:', JSON.stringify({
      id: customer.id,
      email: customer.email,
      first_name: customer.first_name,
      last_name: customer.last_name,
      default_address: customer.default_address,
      addresses_count: customer.addresses ? customer.addresses.length : 0,
      addresses: customer.addresses ? customer.addresses.map(addr => ({
        id: addr.id,
        address1: addr.address1,
        city: addr.city,
        zip: addr.zip,
        country: addr.country
      })) : null
    }, null, 2));

    // Helper function to check if address has meaningful data (not just country)
    const hasAddressData = (addr) => {
      if (!addr) return false;
      return !!(addr.address1 && addr.address1.trim() && addr.city && addr.city.trim() && addr.zip && addr.zip.trim());
    };

    // Find the best address - prefer one with complete data (address1, city, zip)
    // Check all addresses in the array, not just default_address
    let bestAddress = null;
    
    // First, try to find an address with complete data in addresses array
    if (customer.addresses && customer.addresses.length > 0) {
      for (const addr of customer.addresses) {
        if (hasAddressData(addr)) {
          bestAddress = addr;
          console.log('Found complete address in addresses array:', addr.id);
          break;
        }
      }
      
      // If no complete address found, use first address (even if incomplete)
      if (!bestAddress && customer.addresses.length > 0) {
        bestAddress = customer.addresses[0];
        console.log('Using first address from addresses array (may be incomplete)');
      }
    }
    
    // Fallback to default_address if addresses array didn't have anything
    if (!bestAddress && customer.default_address) {
      bestAddress = customer.default_address;
      console.log('Using default_address from customer object');
    }

    console.log('Selected address:', JSON.stringify(bestAddress, null, 2));

    // Extract address data - include if it exists, even if some fields are missing
    // We'll let the frontend decide if it's complete or not
    const address = bestAddress ? {
      address1: bestAddress.address1 || '',
      address2: bestAddress.address2 || '',
      city: bestAddress.city || '',
      province: bestAddress.province || '',
      zip: bestAddress.zip || '',
      country: bestAddress.country || bestAddress.country_name || bestAddress.country_code || '',
      phone: bestAddress.phone || ''
    } : undefined;

    // Check email marketing consent
    const acceptsMarketing = customer.email_marketing_consent?.state === 'subscribed' || 
                             customer.accepts_marketing === true;

    // Use email from JWT as fallback if customer.email is empty
    // This is common with OAuth - email might be in JWT but not in customer object
    const customerEmail = customer.email && customer.email.trim() 
      ? customer.email.trim() 
      : (authData.customer.email || '');
    
    // Use first_name and last_name from customer object (may be empty)
    const customerFirstName = customer.first_name && customer.first_name.trim() 
      ? customer.first_name.trim() 
      : '';
    const customerLastName = customer.last_name && customer.last_name.trim() 
      ? customer.last_name.trim() 
      : '';

    console.log('Email fallback check:', {
      customerEmail: customer.email,
      jwtEmail: authData.customer.email,
      finalEmail: customerEmail
    });

    // Ensure we're reading the data correctly
    // Shopify Admin API uses snake_case for field names
    const responseData = {
      id: customer.id ? String(customer.id) : '',
      email: customerEmail,
      firstName: customerFirstName,
      lastName: customerLastName,
      address: address,
      acceptsMarketing: acceptsMarketing
    };

    // Log what we're about to return
    console.log('Response data being sent to frontend:', JSON.stringify(responseData, null, 2));
    
    // Double-check that we're getting actual values
    if (!responseData.email && !responseData.firstName && !responseData.lastName) {
      console.error('WARNING: All customer fields are empty! Full customer object:', JSON.stringify(customer, null, 2));
    }

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
    console.error('Error stack:', error.stack);
    
    // Don't fallback to JWT data - return error instead so we can debug
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
