/**
 * Customer Data Endpoint
 * Fetches current customer profile data from Shopify Customer Account API (GraphQL)
 * Falls back to Admin API if Customer Account API fails
 */

import { getAuthCookie } from '../utils/cookies.js';

const SHOP_ID = process.env.SHOPIFY_SHOP_ID || process.env.VITE_SHOPIFY_SHOP_ID;
const CUSTOMER_ACCOUNT_URL = `https://shopify.com/${SHOP_ID}/account/customer/api/unstable/graphql`;

const STORE_DOMAIN = process.env.VITE_SHOPIFY_STORE_DOMAIN || process.env.SHOPIFY_STORE_DOMAIN;
const ADMIN_TOKEN = process.env.SHOPIFY_ADMIN_API_TOKEN;
const ADMIN_API_VERSION = '2024-04';

/**
 * Normalize country code to ISO 3166-1 alpha-2 format (e.g., "CZ")
 * Handles various formats: "Czech Republic" -> "CZ", "Czechia" -> "CZ", "CZ" -> "CZ"
 */
function normalizeCountryCode(country) {
  if (!country) {
    return '';
  }
  
  // Handle null/undefined
  if (country === null || country === undefined) {
    return '';
  }
  
  // Convert to string if not already
  const countryStr = String(country).trim();
  if (!countryStr) {
    return '';
  }
  
  // If already a 2-letter code, return uppercase
  if (countryStr.length === 2) {
    return countryStr.toUpperCase();
  }
  
  // Map common country names to codes (extended list)
  const countryMap = {
    // Czech Republic variants
    'czech republic': 'CZ',
    'czechia': 'CZ',
    'česká republika': 'CZ',
    'ceska republika': 'CZ',
    // Slovakia variants
    'slovakia': 'SK',
    'slovak republic': 'SK',
    'slovenská republika': 'SK',
    'slovenska republika': 'SK',
    // Other European countries
    'poland': 'PL',
    'polska': 'PL',
    'germany': 'DE',
    'deutschland': 'DE',
    'austria': 'AT',
    'österreich': 'AT',
    'oesterreich': 'AT',
    'hungary': 'HU',
    'magyarország': 'HU',
    'france': 'FR',
    'italy': 'IT',
    'italia': 'IT',
    'spain': 'ES',
    'espana': 'ES',
    'united kingdom': 'GB',
    'uk': 'GB',
    'great britain': 'GB',
    'ireland': 'IE',
    'belgium': 'BE',
    'belgie': 'BE',
    'netherlands': 'NL',
    'switzerland': 'CH',
    'schweiz': 'CH',
    'sweden': 'SE',
    'sverige': 'SE',
    'norway': 'NO',
    'norge': 'NO',
    'denmark': 'DK',
    'finland': 'FI',
    // Other countries
    'united states': 'US',
    'usa': 'US',
    'united states of america': 'US',
    'canada': 'CA',
    'australia': 'AU',
    'new zealand': 'NZ',
    'japan': 'JP',
    'china': 'CN',
    'south korea': 'KR',
    'india': 'IN',
    'brazil': 'BR',
    'mexico': 'MX',
    'argentina': 'AR',
    'portugal': 'PT',
    'greece': 'GR',
    'turkey': 'TR',
    'russia': 'RU',
    'ukraine': 'UA',
    'romania': 'RO',
    'bulgaria': 'BG',
    'croatia': 'HR',
    'slovenia': 'SI',
    'estonia': 'EE',
    'latvia': 'LV',
    'lithuania': 'LT',
  };
  
  const lower = countryStr.toLowerCase();
  if (countryMap[lower]) {
    return countryMap[lower];
  }

  // If we can't map it, try to extract 2-letter code if it looks like one
  // Some APIs might return "CZ" as part of a longer string
  const codeMatch = countryStr.match(/\b([A-Z]{2})\b/i);
  if (codeMatch) {
    return codeMatch[1].toUpperCase();
  }
  
  // If we can't map it, return as-is (might be a valid code we don't know about)
  // But log it for debugging
  console.warn('[normalizeCountryCode] Could not normalize country:', country, '-> returning as-is');
  return countryStr;
}

/**
 * Fetch Customer Account API using cookies (preferred) or access token
 * Shopify Customer Account API prefers cookies when called from server-side
 */
async function fetchCustomerAccount(query, variables = {}, req = null, accessToken = null) {
  const headers = {
    'Content-Type': 'application/json',
  };

  // Method 1: Try with cookies first (preferred for server-side calls)
  if (req && req.headers.cookie) {
    headers['Cookie'] = req.headers.cookie;
    console.log('[Customer Account API] Using cookies for authentication (length):', req.headers.cookie.length);
  } 
  // Method 2: Fallback to access token in header
  else if (accessToken && typeof accessToken === 'string') {
    const tokenPreview = `${accessToken.slice(0, 6)}...${accessToken.slice(-4)}`;
    console.log('[Customer Account API] Using customer access token in header:', tokenPreview, '(length:', accessToken.length, ')');
    
    // Try both header formats
    headers['Shopify-Customer-Access-Token'] = accessToken;
    headers['Authorization'] = `Bearer ${accessToken}`;
  } else {
    console.error('[Customer Account API] Missing both cookies and access token');
    throw new Error('Authentication required - missing cookies or access token');
  }

  console.log('[Customer Account API] Sending request with headers:', {
    'Content-Type': 'application/json',
    hasCookie: !!headers['Cookie'],
    hasShopifyToken: !!headers['Shopify-Customer-Access-Token'],
    hasAuthorization: !!headers['Authorization']
  });

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
    console.error(`[Customer Account API] Error ${response.status}:`, errorText);
    console.error(`[Customer Account API] Response headers:`, Object.fromEntries(response.headers.entries()));
    
    // If cookies failed and we have access token, try with token only
    if (response.status === 401 && headers['Cookie'] && accessToken) {
      console.log('[Customer Account API] 401 with cookies, trying with access token header only...');
      const headersAlt = {
        'Content-Type': 'application/json',
        'Shopify-Customer-Access-Token': accessToken,
        'Authorization': `Bearer ${accessToken}`
      };
      
      const responseAlt = await fetch(CUSTOMER_ACCOUNT_URL, {
        method: 'POST',
        headers: headersAlt,
        body: JSON.stringify({
          query,
          variables,
        }),
      });
      
      if (responseAlt.ok) {
        const dataAlt = await responseAlt.json();
        if (dataAlt.errors && dataAlt.errors.length > 0) {
          const errorMessages = dataAlt.errors.map((error) => error.message).join(', ');
          console.error('[Customer Account API] GraphQL errors (Alt):', errorMessages);
          throw new Error(`GraphQL errors: ${errorMessages}`);
        }
        console.log('[Customer Account API] Success with access token header only');
        return dataAlt;
      }
    }
    
    if (response.status === 401) {
      throw new Error('Authentication required');
    }
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const data = await response.json();

  if (data.errors && data.errors.length > 0) {
    const errorMessages = data.errors.map((error) => error.message).join(', ');
    console.error('[Customer Account API] GraphQL errors:', errorMessages);
    throw new Error(`GraphQL errors: ${errorMessages}`);
  }

  return data;
}

/**
 * Fallback: Fetch customer data from Admin GraphQL API
 * GraphQL API má lepší kontrolu nad tím, co vrací než REST API
 */
async function fetchCustomerFromAdminGraphQL(customerId) {
  if (!STORE_DOMAIN || !ADMIN_TOKEN) {
    console.warn('[Admin GraphQL API] Missing configuration');
    return null;
  }

  const adminGraphQLUrl = `https://${STORE_DOMAIN}/admin/api/${ADMIN_API_VERSION}/graphql.json`;
  
  console.log('[Admin GraphQL API] Fetching customer:', customerId);
  
  // GraphQL query pro získání kompletních customer dat včetně adres
  const query = `
    query getCustomer($id: ID!) {
      customer(id: $id) {
        id
        firstName
        lastName
        email
        defaultAddress {
          address1
          address2
          city
          province
          zip
          countryCodeV2
          phone
        }
        addresses(first: 5) {
          address1
          address2
          city
          province
          zip
          countryCodeV2
          phone
        }
        emailMarketingConsent {
          marketingState
        }
      }
    }
  `;

  // Shopify GraphQL Admin API používá GID formát: gid://shopify/Customer/{id}
  const customerGid = `gid://shopify/Customer/${customerId}`;
  
  try {
    const graphqlResponse = await fetch(adminGraphQLUrl, {
      method: 'POST',
      headers: {
        'X-Shopify-Access-Token': ADMIN_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        variables: {
          id: customerGid
        }
      }),
    });

    if (!graphqlResponse.ok) {
      console.warn('[Admin GraphQL API] Failed:', graphqlResponse.status, graphqlResponse.statusText);
      return null;
    }

    const graphqlData = await graphqlResponse.json();
    
    if (graphqlData.errors) {
      console.error('[Admin GraphQL API] GraphQL errors:', graphqlData.errors);
      return null;
    }

    return graphqlData.data?.customer || null;
  } catch (error) {
    console.error('[Admin GraphQL API] Error:', error.message);
    return null;
  }
}

/**
 * Fallback: Fetch customer data from Admin REST API (legacy)
 */
async function fetchCustomerFromAdminREST(customerId) {
  if (!STORE_DOMAIN || !ADMIN_TOKEN) {
    console.warn('[Admin REST API] Missing configuration');
    return null;
  }

  const adminApiUrl = `https://${STORE_DOMAIN}/admin/api/${ADMIN_API_VERSION}/customers/${customerId}.json`;
  
  console.log('[Admin REST API] Fetching customer:', adminApiUrl);
  
  const adminResponse = await fetch(adminApiUrl, {
    method: 'GET',
    headers: {
      'X-Shopify-Access-Token': ADMIN_TOKEN,
      'Content-Type': 'application/json',
    },
  });

  if (!adminResponse.ok) {
    console.warn('[Admin REST API] Failed:', adminResponse.status, adminResponse.statusText);
    return null;
  }

  const adminData = await adminResponse.json();
  
  // DETAILNÍ LOGOVÁNÍ PRO DEBUGGING
  console.log('[Admin REST API] Raw response from Shopify:', JSON.stringify(adminData, null, 2));
  
  if (adminData.customer) {
    console.log('[Admin REST API] Customer object keys:', Object.keys(adminData.customer));
    console.log('[Admin REST API] Customer first_name:', adminData.customer.first_name);
    console.log('[Admin REST API] Customer last_name:', adminData.customer.last_name);
    console.log('[Admin REST API] Customer email:', adminData.customer.email);
    console.log('[Admin REST API] Has default_address:', !!adminData.customer.default_address);
    if (adminData.customer.default_address) {
      console.log('[Admin REST API] Default address keys:', Object.keys(adminData.customer.default_address));
      console.log('[Admin REST API] Default address:', JSON.stringify(adminData.customer.default_address, null, 2));
    }
    console.log('[Admin REST API] Has addresses array:', !!adminData.customer.addresses);
    if (adminData.customer.addresses && adminData.customer.addresses.length > 0) {
      console.log('[Admin REST API] Addresses count:', adminData.customer.addresses.length);
      console.log('[Admin REST API] First address:', JSON.stringify(adminData.customer.addresses[0], null, 2));
    }
  }
  
  return adminData.customer || null;
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

    const updateResult = await fetchCustomerAccount(updateQuery, updateVariables, req, null);

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

export default async function handler(req, res) {
  // ========== POST: UPDATE CUSTOMER PROFILE ==========
  if (req.method === 'POST') {
    // Check URL to determine which API to use
    const url = req.url || '';
    
    // If URL contains /admin-update, use Admin API
    if (url.includes('/admin-update')) {
      return handleAdminUpdate(req, res);
    }
    
    // Otherwise, use Customer Account API
    return handleCustomerAccountUpdate(req, res);
  }

  // ========== GET: GET CUSTOMER PROFILE ==========
  if (req.method === 'GET') {

  try {
    // Verify authentication
    const authData = getAuthCookie(req);
    
    if (!authData || !authData.customer || !authData.customer.sub) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const accessToken = authData.access_token;
    if (!accessToken || typeof accessToken !== 'string') {
      console.error('[Customer Account API] Missing customer access token in auth cookie');
      return res.status(401).json({ error: 'Authentication required' });
    }

    const customerId = authData.customer.sub;
    const numericCustomerId = String(customerId);

    // ========== PRIMARY: TRY CUSTOMER ACCOUNT API GRAPHQL ==========
    console.log('=== ATTEMPTING CUSTOMER ACCOUNT API (PRIMARY) ===');
    console.log('[DEBUG] SHOP_ID:', SHOP_ID ? 'CONFIGURED' : 'MISSING');
    console.log('[DEBUG] SHOP_ID value:', SHOP_ID || 'undefined');
    
    let customerData = null;
    let dataSource = 'unknown';

    try {
      if (!SHOP_ID) {
        console.error('[Customer Account API] SHOPIFY_SHOP_ID NOT CONFIGURED - SKIPPING CUSTOMER ACCOUNT API');
        console.error('[Customer Account API] Available env vars:', {
          SHOPIFY_SHOP_ID: !!process.env.SHOPIFY_SHOP_ID,
          VITE_SHOPIFY_SHOP_ID: !!process.env.VITE_SHOPIFY_SHOP_ID,
          SHOP_ID_value: SHOP_ID
        });
      } else {
        console.log('[Customer Account API] SHOP_ID is configured, attempting Customer Account API call...');
        const customerAccountQuery = `
          query {
            customer {
              id
              firstName
              lastName
              emailAddress {
                emailAddress
              }
              defaultAddress {
                address1
                address2
                city
                province
                zip
                country
                phone
              }
              addresses(first: 5) {
                edges {
                  node {
                    id
                    address1
                    address2
                    city
                    province
                    zip
                    country
                    phone
                  }
                }
              }
              emailMarketingSubscriptionState {
                emailMarketingSubscriptionState
              }
            }
          }
        `;

        const tokenPreview = `${accessToken.slice(0, 6)}...${accessToken.slice(-4)}`;
        console.log('[Customer Account API] Using access_token:', tokenPreview, '(length:', accessToken.length, ')');
        // Pass both req (for cookies) and accessToken (for fallback)
        const response = await fetchCustomerAccount(customerAccountQuery, {}, req, accessToken);
        console.log('[Customer Account API] Response received:', JSON.stringify(response, null, 2));

        if (response.data && response.data.customer) {
          const caCustomer = response.data.customer;
          dataSource = 'customer_account_api';

          // Extract email
          const email = caCustomer.emailAddress?.emailAddress || authData.customer.email || '';

          // Extract name
          const firstName = caCustomer.firstName || '';
          const lastName = caCustomer.lastName || '';

          // Extract address (prioritize defaultAddress, fallback to first address)
          let address = null;
          if (caCustomer.defaultAddress) {
            const addr = caCustomer.defaultAddress;
            console.log('[Customer Account API] Raw defaultAddress from Shopify:', JSON.stringify(addr, null, 2));
            
            const normalizedCountry = normalizeCountryCode(addr.country);
            console.log('[Customer Account API] Country normalization:', {
              original: addr.country,
              normalized: normalizedCountry
            });
            
            address = {
              address1: addr.address1 || '',
              address2: addr.address2 || '',
              city: addr.city || '',
              province: addr.province || '',
              zip: addr.zip || '',
              country: normalizedCountry,
              phone: addr.phone || ''
            };
            console.log('[Customer Account API] Using defaultAddress, normalized address:', JSON.stringify(address, null, 2));
          } else if (caCustomer.addresses?.edges && caCustomer.addresses.edges.length > 0) {
            const addr = caCustomer.addresses.edges[0].node;
            console.log('[Customer Account API] Raw address from addresses array:', JSON.stringify(addr, null, 2));
            
            const normalizedCountry = normalizeCountryCode(addr.country);
            console.log('[Customer Account API] Country normalization:', {
              original: addr.country,
              normalized: normalizedCountry
            });
            
            address = {
              address1: addr.address1 || '',
              address2: addr.address2 || '',
              city: addr.city || '',
              province: addr.province || '',
              zip: addr.zip || '',
              country: normalizedCountry,
              phone: addr.phone || ''
            };
            console.log('[Customer Account API] Using first address from addresses array, normalized address:', JSON.stringify(address, null, 2));
          } else {
            console.log('[Customer Account API] No address found in customer data');
            console.log('[Customer Account API] defaultAddress:', caCustomer.defaultAddress);
            console.log('[Customer Account API] addresses:', caCustomer.addresses);
          }

          // Extract email marketing subscription
          const acceptsMarketing = caCustomer.emailMarketingSubscriptionState?.emailMarketingSubscriptionState === 'SUBSCRIBED';

          // Check if Customer Account API returned meaningful data
          // If firstName, lastName, and address are all empty, treat it as failed and use fallback
          const hasName = firstName.trim().length > 0 || lastName.trim().length > 0;
          const hasAddress = address && (
            (address.address1 && address.address1.trim().length > 0) ||
            (address.city && address.city.trim().length > 0) ||
            (address.zip && address.zip.trim().length > 0)
          );
          
          const hasUsefulData = hasName || hasAddress;
          
          console.log('[Customer Account API] Data quality check:', {
            hasName,
            hasAddress,
            hasUsefulData,
            firstName: firstName,
            lastName: lastName,
            address: address
          });

          if (hasUsefulData) {
            // Customer Account API returned useful data, use it
          customerData = {
            id: caCustomer.id ? String(caCustomer.id) : numericCustomerId,
            email: email,
            firstName: firstName,
            lastName: lastName,
            address: address,
            acceptsMarketing: acceptsMarketing
          };

          console.log('[Customer Account API] Successfully extracted customer data:', JSON.stringify(customerData, null, 2));
          } else {
            // Customer Account API returned empty data, treat as failed and use fallback
            console.warn('[Customer Account API] Customer Account API returned empty/incomplete data, will use Admin API fallback');
            console.warn('[Customer Account API] Customer Account API data:', {
              firstName: firstName,
              lastName: lastName,
              address: address
            });
            customerData = null; // Force fallback to Admin API
            dataSource = 'unknown'; // Reset dataSource since we're not using this data
          }
        } else {
          console.warn('[Customer Account API] No customer data in response - response.data:', response.data);
        }
      }
    } catch (customerAccountError) {
      console.error('[Customer Account API] ERROR CAUGHT:', customerAccountError.message);
      console.error('[Customer Account API] Error stack:', customerAccountError.stack);
      console.error('[Customer Account API] Error type:', customerAccountError.constructor.name);
      console.log('[Customer Account API] Falling back to Admin API...');
    }

    // ========== FALLBACK: TRY ADMIN GRAPHQL API ==========
    if (!customerData) {
      console.log('=== FALLING BACK TO ADMIN GRAPHQL API ===');
      
      try {
        // Zkusit Admin GraphQL API (lepší než REST)
        let adminCustomer = await fetchCustomerFromAdminGraphQL(numericCustomerId);
        
        if (adminCustomer) {
          dataSource = 'admin_graphql_api';
          
          // Admin GraphQL API používá camelCase
          const email = adminCustomer.email && adminCustomer.email.trim()
            ? adminCustomer.email.trim()
            : (authData.customer.email || '');

          const firstName = adminCustomer.firstName && adminCustomer.firstName.trim()
            ? adminCustomer.firstName.trim()
            : '';
          const lastName = adminCustomer.lastName && adminCustomer.lastName.trim()
            ? adminCustomer.lastName.trim()
            : '';

          // Extract address
          let address = null;
          if (adminCustomer.defaultAddress) {
            const addr = adminCustomer.defaultAddress;
            console.log('[Admin GraphQL API] Raw defaultAddress from Shopify:', JSON.stringify(addr, null, 2));
            
            if (addr.address1 || addr.city || addr.zip) {
              const normalizedCountry = normalizeCountryCode(addr.countryCodeV2);
              console.log('[Admin GraphQL API] Country normalization:', {
                original: addr.countryCodeV2,
                normalized: normalizedCountry
              });
              
              address = {
                address1: addr.address1 || '',
                address2: addr.address2 || '',
                city: addr.city || '',
                province: addr.province || '',
                zip: addr.zip || '',
                country: normalizedCountry,
                phone: addr.phone || ''
              };
              console.log('[Admin GraphQL API] Normalized address:', JSON.stringify(address, null, 2));
            }
          } else if (adminCustomer.addresses && adminCustomer.addresses.length > 0) {
            const addr = adminCustomer.addresses[0];
            console.log('[Admin GraphQL API] Raw address from addresses array:', JSON.stringify(addr, null, 2));
            
            if (addr.address1 || addr.city || addr.zip) {
              const normalizedCountry = normalizeCountryCode(addr.countryCodeV2);
              console.log('[Admin GraphQL API] Country normalization:', {
                original: addr.countryCodeV2,
                normalized: normalizedCountry
              });
              
              address = {
                address1: addr.address1 || '',
                address2: addr.address2 || '',
                city: addr.city || '',
                province: addr.province || '',
                zip: addr.zip || '',
                country: normalizedCountry,
                phone: addr.phone || ''
              };
              console.log('[Admin GraphQL API] Normalized address:', JSON.stringify(address, null, 2));
            }
          } else {
            console.log('[Admin GraphQL API] No address found in customer data');
          }

          // Extract email marketing consent
          const acceptsMarketing = adminCustomer.emailMarketingConsent?.marketingState === 'SUBSCRIBED';

          customerData = {
            id: numericCustomerId,
            email: email,
            firstName: firstName,
            lastName: lastName,
            address: address,
            acceptsMarketing: acceptsMarketing
          };

          console.log('[Admin GraphQL API] Successfully extracted customer data:', JSON.stringify(customerData, null, 2));
        } else {
          // Pokud GraphQL selže, zkusit REST API jako poslední možnost
          console.log('=== FALLING BACK TO ADMIN REST API (LEGACY) ===');
          adminCustomer = await fetchCustomerFromAdminREST(numericCustomerId);
          
          if (adminCustomer) {
            dataSource = 'admin_rest_api';

            // REST API používá snake_case
            const email = adminCustomer.email && adminCustomer.email.trim()
              ? adminCustomer.email.trim()
              : (authData.customer.email || '');

            let firstName = adminCustomer.first_name && adminCustomer.first_name.trim()
              ? adminCustomer.first_name.trim()
              : '';
            let lastName = adminCustomer.last_name && adminCustomer.last_name.trim()
              ? adminCustomer.last_name.trim()
              : '';

            // Try to extract name from default_address or addresses if not in root
            if ((!firstName || !lastName) && adminCustomer.default_address) {
              if (!firstName && adminCustomer.default_address.first_name) {
                firstName = adminCustomer.default_address.first_name.trim();
              }
              if (!lastName && adminCustomer.default_address.last_name) {
                lastName = adminCustomer.default_address.last_name.trim();
              }
            }

            if ((!firstName || !lastName) && adminCustomer.addresses && adminCustomer.addresses.length > 0) {
              const firstAddr = adminCustomer.addresses[0];
              if (!firstName && firstAddr.first_name) {
                firstName = firstAddr.first_name.trim();
              }
              if (!lastName && firstAddr.last_name) {
                lastName = firstAddr.last_name.trim();
              }
            }

            // Extract address
            let address = null;
            if (adminCustomer.default_address) {
              const addr = adminCustomer.default_address;
              console.log('[Admin REST API] Raw default_address from Shopify:', JSON.stringify(addr, null, 2));
              
              if (addr.address1 || addr.city || addr.zip) {
                const rawCountry = addr.country || addr.country_name || addr.country_code || '';
                const normalizedCountry = normalizeCountryCode(rawCountry);
                console.log('[Admin REST API] Country normalization:', {
                  original: rawCountry,
                  normalized: normalizedCountry
                });
                
                address = {
                  address1: addr.address1 || '',
                  address2: addr.address2 || '',
                  city: addr.city || '',
                  province: addr.province || '',
                  zip: addr.zip || '',
                  country: normalizedCountry,
                  phone: addr.phone || ''
                };
                console.log('[Admin REST API] Normalized address:', JSON.stringify(address, null, 2));
              }
            } else if (adminCustomer.addresses && adminCustomer.addresses.length > 0) {
              const addr = adminCustomer.addresses[0];
              console.log('[Admin REST API] Raw address from addresses array:', JSON.stringify(addr, null, 2));
              
              if (addr.address1 || addr.city || addr.zip) {
                const rawCountry = addr.country || addr.country_name || addr.country_code || '';
                const normalizedCountry = normalizeCountryCode(rawCountry);
                console.log('[Admin REST API] Country normalization:', {
                  original: rawCountry,
                  normalized: normalizedCountry
                });
                
                address = {
                  address1: addr.address1 || '',
                  address2: addr.address2 || '',
                  city: addr.city || '',
                  province: addr.province || '',
                  zip: addr.zip || '',
                  country: normalizedCountry,
                  phone: addr.phone || ''
                };
                console.log('[Admin REST API] Normalized address:', JSON.stringify(address, null, 2));
              }
            } else {
              console.log('[Admin REST API] No address found in customer data');
            }

            // Extract email marketing consent
            const acceptsMarketing = adminCustomer.email_marketing_consent?.state === 'subscribed' ||
                                   adminCustomer.accepts_marketing === true;

            customerData = {
              id: numericCustomerId,
              email: email,
              firstName: firstName,
              lastName: lastName,
      address: address,
      acceptsMarketing: acceptsMarketing
    };

            console.log('[Admin REST API] Successfully extracted customer data:', JSON.stringify(customerData, null, 2));
          }
        }
      } catch (adminApiError) {
        console.error('[Admin API] Fallback error:', adminApiError.message);
      }
    }

    // ========== FALLBACK TO SUPABASE ==========
    if (!customerData || !customerData.firstName || !customerData.lastName || !customerData.address) {
      console.log('=== FALLING BACK TO SUPABASE ===');
      try {
        const { getSupabaseAdmin } = await import('../utils/supabase.js');
        const supabase = getSupabaseAdmin();

        const { data: supabaseData, error: supabaseError } = await supabase
          .from('customer_profiles')
          .select('*')
          .eq('shopify_customer_id', numericCustomerId)
          .single();

        if (!supabaseError && supabaseData) {
          console.log('[Supabase Fallback] Found customer profile in Supabase');
          
          // Check if Supabase has meaningful data
          const hasName = supabaseData.first_name && supabaseData.last_name;
          const hasAddress = supabaseData.address1 && supabaseData.city && supabaseData.zip;

          if (hasName || hasAddress) {
            customerData = {
              id: numericCustomerId,
              email: supabaseData.email || email,
              firstName: supabaseData.first_name || '',
              lastName: supabaseData.last_name || '',
              address: (supabaseData.address1 || supabaseData.city || supabaseData.zip) ? {
                address1: supabaseData.address1 || '',
                address2: supabaseData.address2 || '',
                city: supabaseData.city || '',
                province: supabaseData.province || '',
                zip: supabaseData.zip || '',
                country: supabaseData.country || '',
                phone: supabaseData.phone || ''
              } : null,
              acceptsMarketing: supabaseData.accepts_marketing || false
            };
            dataSource = 'supabase';
            console.log('[Supabase Fallback] Successfully loaded customer data from Supabase:', JSON.stringify(customerData, null, 2));
          } else {
            console.log('[Supabase Fallback] Supabase data exists but is incomplete');
          }
        } else {
          console.log('[Supabase Fallback] No customer profile found in Supabase');
        }
      } catch (supabaseFallbackError) {
        console.error('[Supabase Fallback] Error:', supabaseFallbackError.message);
        // Continue - don't fail if Supabase is unavailable
      }
    }

    // ========== FINAL RESULT ==========
    if (!customerData) {
      console.error('[ERROR] No customer data from any source');
      return res.status(500).json({
        error: 'Failed to fetch customer data',
        details: 'Customer data not available from Customer Account API, Admin API, or Supabase'
      });
    }

    // Log final data source
    console.log(`=== CUSTOMER DATA RETRIEVED FROM: ${dataSource.toUpperCase()} ===`);
    console.log('Final customer data:', JSON.stringify(customerData, null, 2));

    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
    return res.status(200).json(customerData);

  } catch (error) {
    console.error('=== CUSTOMER API ERROR ===');
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
