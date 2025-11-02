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

    // ========== DIAGNOSTICKÉ LOGOVÁNÍ - PŘED UPDATE ==========
    const updateStartTime = Date.now();
    console.log('=== CUSTOMER UPDATE REQUEST START ===');
    console.log('Request received at:', new Date().toISOString());
    console.log('Customer ID:', numericCustomerId);
    console.log('Input data:', {
      firstName,
      lastName,
      hasAddress: !!address,
      addressDetails: address,
      acceptsMarketing
    });

    // Fetch current customer data to get existing addresses
    console.log('=== FETCHING CURRENT CUSTOMER DATA ===');
    const getCustomerStartTime = Date.now();
    const getCustomerResponse = await fetch(`https://${STORE_DOMAIN}/admin/api/${ADMIN_API_VERSION}/customers/${numericCustomerId}.json`, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': ADMIN_TOKEN,
        'Content-Type': 'application/json',
      },
    });
    const getCustomerTime = Date.now() - getCustomerStartTime;
    
    let existingAddresses = [];
    let currentCustomerData = null;
    if (getCustomerResponse.ok) {
      const currentData = await getCustomerResponse.json();
      currentCustomerData = currentData.customer;
      existingAddresses = currentData.customer?.addresses || [];
      console.log('Current customer data fetched:', {
        timeMs: getCustomerTime,
        existingAddressesCount: existingAddresses.length,
        currentFirstName: currentCustomerData?.first_name,
        currentLastName: currentCustomerData?.last_name,
        existingAddresses: existingAddresses.map(addr => ({
          id: addr.id,
          default: addr.default,
          address1: addr.address1,
          city: addr.city,
          zip: addr.zip
        }))
      });
    } else {
      console.warn('Failed to fetch current customer data:', getCustomerResponse.status);
    }

    // Build update payload for Admin API
    const updatePayload = {
      customer: {}
    };

    if (firstName) updatePayload.customer.first_name = firstName;
    if (lastName) updatePayload.customer.last_name = lastName;

    // Handle address update - create or update first address
    if (address) {
      // Normalize country code - Shopify expects country_code (e.g., "CZ") not full name
      let countryCode = 'CZ';
      if (address.country) {
        // If country is "Czech Republic" or "Czechia", convert to "CZ"
        if (address.country === 'Czech Republic' || address.country === 'Czechia') {
          countryCode = 'CZ';
        } else if (address.country.length === 2) {
          // If it's already a 2-letter code, use it
          countryCode = address.country.toUpperCase();
        } else {
          // Try to extract code or use as-is
          countryCode = address.country;
        }
      }

      const addressData = {
        address1: address.address1 || '',
        address2: address.address2 || '',
        city: address.city || '',
        province: address.province || '',
        zip: address.zip || '',
        country: address.country || 'Czech Republic', // Full country name
        country_code: countryCode, // ISO 3166-1 alpha-2 code (required by Shopify)
        phone: address.phone || ''
      };

      // If customer has addresses, update the first one, otherwise create new
      if (existingAddresses.length > 0) {
        addressData.id = existingAddresses[0].id;
        // Set default flag to true if updating existing address
        addressData.default = true;
        updatePayload.customer.addresses = [addressData];
        console.log('Updating existing address:', {
          id: addressData.id,
          countryCode: addressData.country_code,
          isDefault: addressData.default
        });
      } else {
        // For new addresses, set default flag
        addressData.default = true;
        updatePayload.customer.addresses = [addressData];
        console.log('Creating new address (no existing addresses):', {
          countryCode: addressData.country_code,
          isDefault: addressData.default
        });
      }
    }

    // Handle email marketing consent
    // Poznámka: email_marketing_consent může způsobovat 422 error pokud není správný formát
    // Můžeme ho aktualizovat samostatně nebo použít accepts_marketing boolean místo toho
    if (acceptsMarketing !== undefined) {
      // Zkusit použít accepts_marketing boolean místo email_marketing_consent objektu
      // To je jednodušší a spolehlivější
      updatePayload.customer.accepts_marketing = acceptsMarketing;
      
      // Alternativně můžeme použít email_marketing_consent, ale s opatrností
      // Podle Shopify dokumentace může být state "subscribed" nebo "not_subscribed" (lowercase)
      // Nebo možná potřebujeme jiný formát - pokud to způsobuje 422, zkusit bez tohoto pole
      if (acceptsMarketing) {
        const consentTimestamp = new Date().toISOString();
        updatePayload.customer.email_marketing_consent = {
          state: 'subscribed',
          opt_in_level: 'single_opt_in',
          consent_updated_at: consentTimestamp
        };
      }
    }

    // ========== LOGOVÁNÍ PAYLOAD PŘED ODESLÁNÍM ==========
    console.log('=== UPDATE PAYLOAD TO SEND ===');
    console.log(JSON.stringify(updatePayload, null, 2));
    console.log('Payload details:', {
      hasFirstName: !!updatePayload.customer.first_name,
      hasLastName: !!updatePayload.customer.last_name,
      hasAddresses: !!updatePayload.customer.addresses,
      addressesCount: updatePayload.customer.addresses?.length || 0,
      firstAddressDefault: updatePayload.customer.addresses?.[0]?.default,
      hasEmailMarketingConsent: !!updatePayload.customer.email_marketing_consent
    });

    // Call Shopify Admin API
    const adminApiUrl = `https://${STORE_DOMAIN}/admin/api/${ADMIN_API_VERSION}/customers/${numericCustomerId}.json`;
    
    console.log('=== SENDING UPDATE REQUEST TO SHOPIFY ===');
    const updateRequestStartTime = Date.now();
    const adminResponse = await fetch(adminApiUrl, {
      method: 'PUT',
      headers: {
        'X-Shopify-Access-Token': ADMIN_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(updatePayload),
    });
    const updateRequestTime = Date.now() - updateRequestStartTime;
    
    console.log('Update request completed:', {
      status: adminResponse.status,
      statusText: adminResponse.statusText,
      timeMs: updateRequestTime
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

    // ========== LOGOVÁNÍ RESPONSE PO UPDATE ==========
    const adminData = await adminResponse.json();
    const totalUpdateTime = Date.now() - updateStartTime;

    console.log('=== SHOPIFY UPDATE RESPONSE ===');
    console.log('Response status:', adminResponse.status);
    console.log('Total update time (ms):', totalUpdateTime);
    console.log('Full response:', JSON.stringify(adminData, null, 2));

    if (!adminData.customer) {
      console.error('Invalid response from Shopify Admin API:', adminData);
      return res.status(500).json({ error: 'Neplatná odpověď z Shopify API.' });
    }

    const customer = adminData.customer;

    // ========== DETAILNÍ LOGOVÁNÍ CUSTOMER DATA Z RESPONSE ==========
    console.log('=== CUSTOMER DATA FROM UPDATE RESPONSE ===');
    console.log({
      id: customer.id,
      email: customer.email,
      first_name: customer.first_name,
      last_name: customer.last_name,
      addressesCount: customer.addresses?.length || 0,
      defaultAddressId: customer.default_address?.id,
      hasDefaultAddress: !!customer.default_address,
      allAddresses: customer.addresses?.map(addr => ({
        id: addr.id,
        default: addr.default,
        address1: addr.address1,
        city: addr.city,
        zip: addr.zip,
        country: addr.country
      })) || []
    });

    // Get default address (first address or null)
    // Try to find address with default: true first
    let defaultAddress = null;
    
    if (customer.addresses && customer.addresses.length > 0) {
      // First, try to find address with default flag
      defaultAddress = customer.addresses.find(addr => addr.default === true);
      if (!defaultAddress) {
        // If no default, use first address
        defaultAddress = customer.addresses[0];
      }
      console.log('Selected address from response:', {
        id: defaultAddress.id,
        isDefault: defaultAddress.default,
        address1: defaultAddress.address1,
        city: defaultAddress.city,
        zip: defaultAddress.zip
      });
    } else if (customer.default_address) {
      defaultAddress = customer.default_address;
      console.log('Using default_address from customer object');
    }

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

    // ========== VERIFIKACE DAT PO UPDATE ==========
    console.log('=== VERIFICATION AFTER UPDATE ===');
    const verificationResult = {
      firstNameMatch: customer.first_name === firstName,
      lastNameMatch: customer.last_name === lastName,
      hasAddress: !!addressResponse,
      addressComplete: addressResponse && addressResponse.address1 && addressResponse.city && addressResponse.zip,
      totalTimeMs: totalUpdateTime
    };
    console.log('Verification result:', verificationResult);

    console.log('Customer profile updated successfully via Admin API:', {
      id: customer.id,
      firstName: customer.first_name,
      lastName: customer.last_name,
      hasAddress: !!defaultAddress,
      acceptsMarketing: acceptsMarketingResponse,
      verification: verificationResult
    });

    // ========== VERIFIKACE S RETRY LOGIKOU ==========
    // Pokud data nejsou správně uložena, zkusit znovu načíst po krátké pauze
    let verifiedData = {
      id: customer.id.toString(),
      email: customer.email,
      firstName: customer.first_name || '',
      lastName: customer.last_name || '',
      address: addressResponse,
      acceptsMarketing: acceptsMarketingResponse
    };

    // Pokud data nejsou kompletní, zkusit znovu načíst po delay
    if (!verificationResult.firstNameMatch || !verificationResult.lastNameMatch || !verificationResult.addressComplete) {
      console.log('=== DATA NOT COMPLETE, TRYING RETRY ===');
      const maxRetries = 3;
      const retryDelay = 1000; // 1 sekunda
      
      for (let retry = 1; retry <= maxRetries; retry++) {
        console.log(`Retry attempt ${retry}/${maxRetries}, waiting ${retryDelay}ms...`);
        await new Promise(resolve => setTimeout(resolve, retryDelay));
        
        // Znovu načíst data ze Shopify
        const verifyResponse = await fetch(adminApiUrl, {
          method: 'GET',
          headers: {
            'X-Shopify-Access-Token': ADMIN_TOKEN,
            'Content-Type': 'application/json',
          },
        });
        
        if (verifyResponse.ok) {
          const verifyData = await verifyResponse.json();
          const verifyCustomer = verifyData.customer;
          
          console.log(`Retry ${retry} - Customer data:`, {
            firstName: verifyCustomer.first_name,
            lastName: verifyCustomer.last_name,
            addressesCount: verifyCustomer.addresses?.length || 0
          });
          
          // Zkontrolovat, jestli data jsou nyní kompletní
          const firstNameOk = verifyCustomer.first_name && verifyCustomer.first_name.trim();
          const lastNameOk = verifyCustomer.last_name && verifyCustomer.last_name.trim();
          
          // Najít default address
          let verifyAddress = null;
          if (verifyCustomer.addresses && verifyCustomer.addresses.length > 0) {
            verifyAddress = verifyCustomer.addresses.find(addr => addr.default === true) || verifyCustomer.addresses[0];
          } else if (verifyCustomer.default_address) {
            verifyAddress = verifyCustomer.default_address;
          }
          
          const addressOk = verifyAddress && verifyAddress.address1 && verifyAddress.city && verifyAddress.zip;
          
          if (firstNameOk && lastNameOk && addressOk) {
            console.log(`Retry ${retry} - Data verified successfully!`);
            verifiedData = {
              id: verifyCustomer.id.toString(),
              email: verifyCustomer.email || customer.email,
              firstName: verifyCustomer.first_name || '',
              lastName: verifyCustomer.last_name || '',
              address: verifyAddress ? {
                address1: verifyAddress.address1 || '',
                address2: verifyAddress.address2 || '',
                city: verifyAddress.city || '',
                province: verifyAddress.province || '',
                zip: verifyAddress.zip || '',
                country: verifyAddress.country || verifyAddress.country_name || verifyAddress.country_code || '',
                phone: verifyAddress.phone || ''
              } : undefined,
              acceptsMarketing: verifyCustomer.email_marketing_consent?.state === 'subscribed' || 
                               verifyCustomer.accepts_marketing === true
            };
            break;
          }
        }
      }
    }

    // Return data in same format as Customer Account API
    return res.status(200).json(verifiedData);
  } catch (error) {
    console.error('Customer update API error:', error);
    const errorMessage = error.message || 'Internal server error';
    
    return res.status(500).json({ 
      error: errorMessage.includes('Shopify API') ? errorMessage : 'Aktualizace profilu se nezdařila. Zkuste to prosím znovu.' 
    });
  }
}
