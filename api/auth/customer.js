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
 * Fetch Customer Account API using cookies (same pattern as api/favorites/index.js)
 */
async function fetchCustomerAccount(query, variables = {}, req = null) {
  const headers = {
    'Content-Type': 'application/json',
  };

  // Shopify Customer Account API requires session cookies from shopify.com domain
  // These cookies are set during OAuth flow and contain authentication session
  // We must forward ALL cookies from the browser request to Shopify API
  if (req && req.headers.cookie) {
    headers['Cookie'] = req.headers.cookie;
    console.log('[Customer Account API] Forwarding cookies (length):', req.headers.cookie.length);
  } else {
    console.error('[Customer Account API] No cookies found in request headers');
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
    console.error(`[Customer Account API] Error ${response.status}:`, errorText);
    
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
 * Fallback: Fetch customer data from Admin API
 */
async function fetchCustomerFromAdminAPI(customerId) {
  if (!STORE_DOMAIN || !ADMIN_TOKEN) {
    console.warn('[Admin API] Missing configuration');
    return null;
  }

  const adminApiUrl = `https://${STORE_DOMAIN}/admin/api/${ADMIN_API_VERSION}/customers/${customerId}.json`;
  
  console.log('[Admin API] Fetching customer:', adminApiUrl);
  
  const adminResponse = await fetch(adminApiUrl, {
    method: 'GET',
    headers: {
      'X-Shopify-Access-Token': ADMIN_TOKEN,
      'Content-Type': 'application/json',
    },
  });

  if (!adminResponse.ok) {
    console.warn('[Admin API] Failed:', adminResponse.status, adminResponse.statusText);
    return null;
  }

  const adminData = await adminResponse.json();
  return adminData.customer || null;
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authData = getAuthCookie(req);
    
    if (!authData || !authData.customer || !authData.customer.sub) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const customerId = authData.customer.sub;
    const numericCustomerId = String(customerId);

    // ========== PRIMARY: TRY CUSTOMER ACCOUNT API GRAPHQL ==========
    console.log('=== ATTEMPTING CUSTOMER ACCOUNT API (PRIMARY) ===');
    
    let customerData = null;
    let dataSource = 'unknown';

    try {
      if (!SHOP_ID) {
        console.warn('[Customer Account API] SHOPIFY_SHOP_ID not configured, skipping');
      } else {
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

        const response = await fetchCustomerAccount(customerAccountQuery, {}, req);
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
            address = {
              address1: addr.address1 || '',
              address2: addr.address2 || '',
              city: addr.city || '',
              province: addr.province || '',
              zip: addr.zip || '',
              country: addr.country || '',
              phone: addr.phone || ''
            };
            console.log('[Customer Account API] Using defaultAddress');
          } else if (caCustomer.addresses?.edges && caCustomer.addresses.edges.length > 0) {
            const addr = caCustomer.addresses.edges[0].node;
            address = {
              address1: addr.address1 || '',
              address2: addr.address2 || '',
              city: addr.city || '',
              province: addr.province || '',
              zip: addr.zip || '',
              country: addr.country || '',
              phone: addr.phone || ''
            };
            console.log('[Customer Account API] Using first address from addresses array');
          }

          // Extract email marketing subscription
          const acceptsMarketing = caCustomer.emailMarketingSubscriptionState?.emailMarketingSubscriptionState === 'SUBSCRIBED';

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
          console.warn('[Customer Account API] No customer data in response');
        }
      }
    } catch (customerAccountError) {
      console.error('[Customer Account API] Error:', customerAccountError.message);
      console.log('[Customer Account API] Falling back to Admin API...');
    }

    // ========== FALLBACK: TRY ADMIN API ==========
    if (!customerData) {
      console.log('=== FALLING BACK TO ADMIN API ===');
      
      try {
        const adminCustomer = await fetchCustomerFromAdminAPI(numericCustomerId);
        
        if (adminCustomer) {
          dataSource = 'admin_api';

          // Extract email (fallback to JWT)
          const email = adminCustomer.email && adminCustomer.email.trim()
            ? adminCustomer.email.trim()
            : (authData.customer.email || '');

          // Extract name from customer root or addresses
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
            if (addr.address1 || addr.city || addr.zip) {
              address = {
                address1: addr.address1 || '',
                address2: addr.address2 || '',
                city: addr.city || '',
                province: addr.province || '',
                zip: addr.zip || '',
                country: addr.country || addr.country_name || addr.country_code || '',
                phone: addr.phone || ''
              };
            }
          } else if (adminCustomer.addresses && adminCustomer.addresses.length > 0) {
            const addr = adminCustomer.addresses[0];
            if (addr.address1 || addr.city || addr.zip) {
              address = {
                address1: addr.address1 || '',
                address2: addr.address2 || '',
                city: addr.city || '',
                province: addr.province || '',
                zip: addr.zip || '',
                country: addr.country || addr.country_name || addr.country_code || '',
                phone: addr.phone || ''
              };
            }
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

          console.log('[Admin API] Successfully extracted customer data:', JSON.stringify(customerData, null, 2));
        }
      } catch (adminApiError) {
        console.error('[Admin API] Fallback error:', adminApiError.message);
      }
    }

    // ========== FINAL RESULT ==========
    if (!customerData) {
      console.error('[ERROR] No customer data from any source');
      return res.status(500).json({
        error: 'Failed to fetch customer data',
        details: 'Customer data not available from Customer Account API or Admin API'
      });
    }

    // Log final data source
    console.log(`=== CUSTOMER DATA RETRIEVED FROM: ${dataSource.toUpperCase()} ===`);
    console.log('Final customer data:', JSON.stringify(customerData, null, 2));

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
