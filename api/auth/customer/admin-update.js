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

    const { firstName, lastName } = req.body;

    if (!firstName && !lastName) {
      return res.status(400).json({ error: 'At least firstName or lastName is required' });
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
      updates: { firstName, lastName }
    });

    // Build update payload for Admin API
    const updatePayload = {
      customer: {}
    };

    if (firstName) updatePayload.customer.first_name = firstName;
    if (lastName) updatePayload.customer.last_name = lastName;

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

    console.log('Customer profile updated successfully via Admin API:', {
      id: customer.id,
      firstName: customer.first_name,
      lastName: customer.last_name
    });

    // Return data in same format as Customer Account API
    return res.status(200).json({
      id: customer.id.toString(),
      email: customer.email,
      firstName: customer.first_name || '',
      lastName: customer.last_name || ''
    });
  } catch (error) {
    console.error('Customer update API error:', error);
    const errorMessage = error.message || 'Internal server error';
    
    return res.status(500).json({ 
      error: errorMessage.includes('Shopify API') ? errorMessage : 'Aktualizace profilu se nezdařila. Zkuste to prosím znovu.' 
    });
  }
}
