/**
 * Customer Profile Update Endpoint using Shopify Admin API
 * Updates customer profile information (firstName, lastName) using Admin API REST endpoint
 * This avoids CORS issues and cookie requirements of Customer Account API
 */

import { getAuthCookie } from '../../utils/cookies.js';

const STORE_DOMAIN = process.env.VITE_SHOPIFY_STORE_DOMAIN || process.env.SHOPIFY_STORE_DOMAIN;
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;
const ADMIN_API_VERSION = '2024-04'; // Use same version as other endpoints

/**
 * Update customer using Shopify Admin API
 */
export default async function handler(req, res) {
  if (req.method !== 'POST') {
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

    const { firstName, lastName, address, acceptsMarketing } = req.body;

    // At least one field must be provided for update
    if (!firstName && !lastName && !address && acceptsMarketing === undefined) {
      return res.status(400).json({ error: 'At least one field is required for update' });
    }

    // Extract customer ID from OAuth JWT (sub field)
    // Format from OAuth is always numeric ID (e.g., 23325479567704 as number)
    // Admin API accepts both number and string, so we convert to string for consistency
    const customerId = authData.customer.sub;
    
    // Convert to string immediately - OAuth JWT sub is always a number
    // No need to check for GID format as OAuth always returns numeric ID
    const numericCustomerId = String(customerId);

    console.log('Updating customer profile via Admin API:', {
      originalCustomerId: customerId,
      originalCustomerIdType: typeof customerId,
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

    // Handle address update - create or update first address
    if (address) {
      const addressData = {
        address1: address.address1 || '',
        address2: address.address2 || '',
        city: address.city || '',
        province: address.province || '',
        zip: address.zip || '',
        country: address.country || 'CZ', // Default to CZ if not provided
        phone: address.phone || ''
      };

      // If customer has addresses, update the first one, otherwise create new
      if (existingAddresses.length > 0) {
        addressData.id = existingAddresses[0].id;
        updatePayload.customer.addresses = [addressData];
      } else {
        updatePayload.customer.addresses = [addressData];
      }
    }

    // Handle email marketing consent
    if (acceptsMarketing !== undefined) {
      const consentTimestamp = new Date().toISOString();
      updatePayload.customer.email_marketing_consent = {
        state: acceptsMarketing ? 'subscribed' : 'not_subscribed',
        opt_in_level: 'single_opt_in',
        consent_updated_at: consentTimestamp
      };
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

    // Get default address (first address or null)
    const defaultAddress = customer.addresses && customer.addresses.length > 0 
      ? customer.addresses[0] 
      : null;

    // Extract address data
    const addressResponse = defaultAddress ? {
      address1: defaultAddress.address1 || '',
      address2: defaultAddress.address2 || '',
      city: defaultAddress.city || '',
      province: defaultAddress.province || '',
      zip: defaultAddress.zip || '',
      country: defaultAddress.country || '',
      phone: defaultAddress.phone || ''
    } : undefined;

    // Check email marketing consent
    const acceptsMarketingResponse = customer.email_marketing_consent?.state === 'subscribed' || 
                                     customer.accepts_marketing === true;

    console.log('Customer profile updated successfully via Admin API:', {
      id: customer.id,
      firstName: customer.first_name,
      lastName: customer.last_name,
      hasAddress: !!defaultAddress,
      acceptsMarketing: acceptsMarketingResponse
    });

    // Return data in same format as Customer Account API
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
