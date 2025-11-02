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
    // NEPOUŽÍVAT fields parametr - Shopify REST Admin API ho nemusí podporovat správně
    // Získat kompletní response a pak parsovat data
    const adminApiUrl = `https://${STORE_DOMAIN}/admin/api/${ADMIN_API_VERSION}/customers/${numericCustomerId}.json`;
    
    console.log('=== FETCHING CUSTOMER FROM SHOPIFY ADMIN API ===');
    console.log('URL:', adminApiUrl);
    console.log('Customer ID:', numericCustomerId);
    console.log('Store Domain:', STORE_DOMAIN);
    console.log('Request timestamp:', new Date().toISOString());
    console.log('API Version:', ADMIN_API_VERSION);
    
    const fetchStartTime = Date.now();
    const adminResponse = await fetch(adminApiUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': ADMIN_TOKEN,
        'Content-Type': 'application/json',
      },
    });
    const fetchTime = Date.now() - fetchStartTime;

    console.log('=== SHOPIFY API RESPONSE RECEIVED ===');
    console.log('Status:', adminResponse.status, adminResponse.statusText);
    console.log('Response time (ms):', fetchTime);
    console.log('Response headers:', Object.fromEntries(adminResponse.headers.entries()));

    if (!adminResponse.ok) {
      const errorText = await adminResponse.text();
      console.error('=== SHOPIFY API ERROR ===');
      console.error('Status:', adminResponse.status);
      console.error('Error text:', errorText);
      
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

    // ========== RAW RESPONSE LOGGING PŘED PARSOVÁNÍM ==========
    console.log('=== READING RAW RESPONSE TEXT ===');
    const responseText = await adminResponse.text();
    console.log('Raw response text length:', responseText.length);
    console.log('Raw response text (first 500 chars):', responseText.substring(0, 500));
    console.log('Raw response text (full):', responseText);
    
    let adminData;
    try {
      adminData = JSON.parse(responseText);
      console.log('=== JSON PARSED SUCCESSFULLY ===');
    } catch (parseError) {
      console.error('=== JSON PARSE ERROR ===');
      console.error('Parse error:', parseError);
      console.error('Response text that failed to parse:', responseText);
      return res.status(500).json({ 
        error: 'Failed to parse Shopify API response',
        details: parseError.message 
      });
    }
    
    console.log('=== PARSED ADMIN DATA ===');
    console.log('Parsed data keys:', Object.keys(adminData));
    console.log('Full parsed data:', JSON.stringify(adminData, null, 2));

    if (!adminData.customer) {
      console.error('Invalid response from Shopify Admin API - no customer object:', JSON.stringify(adminData, null, 2));
      return res.status(500).json({ error: 'Invalid response from Shopify API' });
    }

    const customer = adminData.customer;

    // ========== DETAILNÍ DIAGNOSTICKÉ LOGOVÁNÍ ==========
    
    // 1. Logovat celý raw response ze Shopify (kompletní objekt)
    console.log('=== FULL RAW CUSTOMER OBJECT FROM SHOPIFY ===');
    console.log(JSON.stringify(customer, null, 2));
    
    // 2. Logovat všechny možné varianty jména a příjmení
    console.log('=== NAME VARIATIONS CHECK ===');
    console.log({
      first_name: customer.first_name,
      firstName: customer.firstName,
      firstname: customer.firstname,
      last_name: customer.last_name,
      lastName: customer.lastName,
      lastname: customer.lastname,
      name: customer.name,
      full_name: customer.full_name,
      fullName: customer.fullName
    });
    
    // 3. Logovat default_address objekt kompletně
    console.log('=== DEFAULT ADDRESS DETAILS ===');
    if (customer.default_address) {
      console.log('Default address exists:', JSON.stringify(customer.default_address, null, 2));
      console.log('Default address fields:', {
        id: customer.default_address.id,
        default: customer.default_address.default,
        address1: customer.default_address.address1,
        address2: customer.default_address.address2,
        city: customer.default_address.city,
        province: customer.default_address.province,
        zip: customer.default_address.zip,
        country: customer.default_address.country,
        country_name: customer.default_address.country_name,
        country_code: customer.default_address.country_code,
        phone: customer.default_address.phone
      });
    } else {
      console.log('No default_address in customer object');
    }
    
    // 4. Logovat všechny adresy v addresses array s detaily
    console.log('=== ALL ADDRESSES IN ARRAY ===');
    if (customer.addresses && customer.addresses.length > 0) {
      console.log(`Total addresses: ${customer.addresses.length}`);
      customer.addresses.forEach((addr, index) => {
        console.log(`--- Address ${index + 1} (ID: ${addr.id}) ---`);
        console.log(JSON.stringify(addr, null, 2));
        console.log('Address fields:', {
          id: addr.id,
          default: addr.default,
          customer_id: addr.customer_id,
          address1: addr.address1,
          address2: addr.address2,
          city: addr.city,
          province: addr.province,
          zip: addr.zip,
          country: addr.country,
          country_name: addr.country_name,
          country_code: addr.country_code,
          phone: addr.phone,
          first_name: addr.first_name,
          last_name: addr.last_name,
          company: addr.company
        });
      });
    } else {
      console.log('No addresses in addresses array');
    }
    
    // 5. Logovat email varianty
    console.log('=== EMAIL VARIATIONS ===');
    console.log({
      email: customer.email,
      email_address: customer.email_address,
      primary_email: customer.primary_email
    });
    
    // 6. Shrnutí struktury customer objektu
    console.log('=== CUSTOMER OBJECT STRUCTURE SUMMARY ===');
    console.log({
      hasId: !!customer.id,
      hasEmail: !!customer.email,
      hasFirstName: !!customer.first_name,
      hasLastName: !!customer.last_name,
      hasDefaultAddress: !!customer.default_address,
      addressesCount: customer.addresses ? customer.addresses.length : 0,
      hasAddressesArray: !!customer.addresses,
      allKeys: Object.keys(customer).sort()
    });

    // Helper function to check if address has meaningful data (not just country)
    const hasAddressData = (addr) => {
      if (!addr) return false;
      return !!(addr.address1 && addr.address1.trim() && addr.city && addr.city.trim() && addr.zip && addr.zip.trim());
    };

    // ========== ZLEPŠENÁ LOGIKA PRO HLEDÁNÍ ADRESY ==========
    // DŮLEŽITÉ: Podle Shopify dokumentace a praxe je default_address často primární zdroj dat
    // Zkontrolovat default_address PŘED addresses array!
    console.log('=== ADDRESS SELECTION LOGIC ===');
    
    let bestAddress = null;
    let selectionReason = '';
    
    // Strategy 1: ZKONTROLOVAT default_address PRVNÍ (nejčastější zdroj dat v Shopify)
    if (customer.default_address) {
      console.log('Checking default_address first (primary source in Shopify)...');
      console.log('Default address data:', {
        id: customer.default_address.id,
        address1: customer.default_address.address1,
        city: customer.default_address.city,
        zip: customer.default_address.zip,
        country: customer.default_address.country,
        first_name: customer.default_address.first_name,
        last_name: customer.default_address.last_name
      });
      
      if (hasAddressData(customer.default_address)) {
        bestAddress = customer.default_address;
        selectionReason = 'default_address with complete data (primary)';
        console.log(`✓ Found: ${selectionReason} (ID: ${customer.default_address.id})`);
      } else if (customer.default_address.address1 || customer.default_address.city) {
        // I když není kompletní, použít pokud má alespoň nějaká data
        bestAddress = customer.default_address;
        selectionReason = 'default_address (has some data)';
        console.log(`⚠ Using: ${selectionReason} (ID: ${customer.default_address.id})`);
      }
    }
    
    // Strategy 2: Pokud default_address není dostupné nebo je prázdné, zkusit addresses array
    if (!bestAddress && customer.addresses && customer.addresses.length > 0) {
      console.log(`Checking ${customer.addresses.length} addresses in array...`);
      
      // Nejprve hledat default address s kompletními daty
      const defaultAddrWithData = customer.addresses.find(addr => 
        addr.default === true && hasAddressData(addr)
      );
      
      if (defaultAddrWithData) {
        bestAddress = defaultAddrWithData;
        selectionReason = 'Default address from array with complete data';
        console.log(`✓ Found: ${selectionReason} (ID: ${defaultAddrWithData.id})`);
      } else {
        // Strategy 3: Najít jakoukoliv adresu s kompletními daty
        const anyCompleteAddr = customer.addresses.find(addr => hasAddressData(addr));
        
        if (anyCompleteAddr) {
          bestAddress = anyCompleteAddr;
          selectionReason = 'Complete address from array (not default)';
          console.log(`✓ Found: ${selectionReason} (ID: ${anyCompleteAddr.id}, default: ${anyCompleteAddr.default})`);
        } else {
          // Strategy 4: Použít default address z array i když není kompletní
          const defaultAddr = customer.addresses.find(addr => addr.default === true);
          
          if (defaultAddr) {
            bestAddress = defaultAddr;
            selectionReason = 'Default address from array (incomplete data)';
            console.log(`⚠ Using: ${selectionReason} (ID: ${defaultAddr.id})`);
          } else {
            // Strategy 5: Použít první adresu jako fallback
            bestAddress = customer.addresses[0];
            selectionReason = 'First address from array (fallback)';
            console.log(`⚠ Using: ${selectionReason} (ID: ${bestAddress.id})`);
          }
        }
      }
    }
    
    console.log('=== ADDRESS SELECTION RESULT ===');
    console.log({
      selectedAddressId: bestAddress?.id,
      selectionReason: selectionReason,
      addressDetails: bestAddress ? {
        default: bestAddress.default,
        address1: bestAddress.address1,
        city: bestAddress.city,
        zip: bestAddress.zip,
        country: bestAddress.country,
        hasCompleteData: hasAddressData(bestAddress)
      } : null
    });

    // ========== EXTRACT ADDRESS DATA WITH FALLBACKS ==========
    console.log('=== EXTRACTING ADDRESS DATA ===');
    
    let address = undefined;
    
    if (bestAddress) {
      console.log('Extracting from bestAddress:', {
        id: bestAddress.id,
        address1: bestAddress.address1,
        city: bestAddress.city,
        zip: bestAddress.zip,
        country: bestAddress.country,
        first_name: bestAddress.first_name,
        last_name: bestAddress.last_name
      });
      
      address = {
        address1: bestAddress.address1 || '',
        address2: bestAddress.address2 || '',
        city: bestAddress.city || '',
        province: bestAddress.province || '',
        zip: bestAddress.zip || '',
        country: bestAddress.country || bestAddress.country_name || bestAddress.country_code || '',
        phone: bestAddress.phone || ''
      };
      
      console.log('Extracted address:', address);
    } else {
      console.log('WARNING: No address found at all - checking all possible sources...');
      
      // Pokud jsme nenašli žádnou adresu, zkontrolovat všechny možné zdroje
      if (customer.default_address) {
        console.log('Trying default_address as absolute last resort');
        address = {
          address1: customer.default_address.address1 || '',
          address2: customer.default_address.address2 || '',
          city: customer.default_address.city || '',
          province: customer.default_address.province || '',
          zip: customer.default_address.zip || '',
          country: customer.default_address.country || customer.default_address.country_name || customer.default_address.country_code || '',
          phone: customer.default_address.phone || ''
        };
        console.log('Extracted from default_address (last resort):', address);
      } else if (customer.addresses && customer.addresses.length > 0) {
        console.log('Trying first address from array as absolute last resort');
        const firstAddr = customer.addresses[0];
        address = {
          address1: firstAddr.address1 || '',
          address2: firstAddr.address2 || '',
          city: firstAddr.city || '',
          province: firstAddr.province || '',
          zip: firstAddr.zip || '',
          country: firstAddr.country || firstAddr.country_name || firstAddr.country_code || '',
          phone: firstAddr.phone || ''
        };
        console.log('Extracted from addresses[0] (last resort):', address);
      } else {
        console.log('ERROR: No address data found in any location!');
      }
    }

    // Check email marketing consent
    const acceptsMarketing = customer.email_marketing_consent?.state === 'subscribed' || 
                             customer.accepts_marketing === true;

    // Use email from JWT as fallback if customer.email is empty
    // This is common with OAuth - email might be in JWT but not in customer object
    const customerEmail = customer.email && customer.email.trim() 
      ? customer.email.trim() 
      : (authData.customer.email || '');
    
    // ========== FALLBACK MECHANISMS FOR FIRST_NAME AND LAST_NAME ==========
    console.log('=== EXTRACTING FIRST_NAME AND LAST_NAME ===');
    
    // Strategy 1: Zkusit z customer root
    let customerFirstName = customer.first_name && customer.first_name.trim() 
      ? customer.first_name.trim() 
      : '';
    let customerLastName = customer.last_name && customer.last_name.trim() 
      ? customer.last_name.trim() 
      : '';
    
    console.log('From customer root:', {
      first_name: customer.first_name,
      last_name: customer.last_name,
      firstName: customerFirstName,
      lastName: customerLastName
    });
    
    // Strategy 2: Pokud nejsou v customer root, zkusit z default_address
    if (!customerFirstName || !customerLastName) {
      if (customer.default_address) {
        const defaultAddrFirstName = customer.default_address.first_name && customer.default_address.first_name.trim()
          ? customer.default_address.first_name.trim()
          : '';
        const defaultAddrLastName = customer.default_address.last_name && customer.default_address.last_name.trim()
          ? customer.default_address.last_name.trim()
          : '';
        
        console.log('Trying default_address:', {
          first_name: customer.default_address.first_name,
          last_name: customer.default_address.last_name,
          extractedFirstName: defaultAddrFirstName,
          extractedLastName: defaultAddrLastName
        });
        
        if (!customerFirstName && defaultAddrFirstName) {
          customerFirstName = defaultAddrFirstName;
          console.log('✓ Using first_name from default_address');
        }
        if (!customerLastName && defaultAddrLastName) {
          customerLastName = defaultAddrLastName;
          console.log('✓ Using last_name from default_address');
        }
      }
      
      // Strategy 3: Zkusit z první adresy v addresses array
      if ((!customerFirstName || !customerLastName) && customer.addresses && customer.addresses.length > 0) {
        const firstAddr = customer.addresses[0];
        const addrFirstName = firstAddr.first_name && firstAddr.first_name.trim()
          ? firstAddr.first_name.trim()
          : '';
        const addrLastName = firstAddr.last_name && firstAddr.last_name.trim()
          ? firstAddr.last_name.trim()
          : '';
        
        console.log('Trying first address:', {
          first_name: firstAddr.first_name,
          last_name: firstAddr.last_name,
          extractedFirstName: addrFirstName,
          extractedLastName: addrLastName
        });
        
        if (!customerFirstName && addrFirstName) {
          customerFirstName = addrFirstName;
          console.log('✓ Using first_name from addresses[0]');
        }
        if (!customerLastName && addrLastName) {
          customerLastName = addrLastName;
          console.log('✓ Using last_name from addresses[0]');
        }
      }
    }
    
    // Strategy 4: Pokud máme bestAddress, zkusit použít first_name/last_name z něj
    // (může být už vybrán, ale ještě jsme nezkontrolovali jeho jméno)
    if ((!customerFirstName || !customerLastName) && bestAddress) {
      const addrFirstName = bestAddress.first_name && bestAddress.first_name.trim()
        ? bestAddress.first_name.trim()
        : '';
      const addrLastName = bestAddress.last_name && bestAddress.last_name.trim()
        ? bestAddress.last_name.trim()
        : '';
      
      console.log('Trying bestAddress for names:', {
        first_name: bestAddress.first_name,
        last_name: bestAddress.last_name,
        extractedFirstName: addrFirstName,
        extractedLastName: addrLastName
      });
      
      if (!customerFirstName && addrFirstName) {
        customerFirstName = addrFirstName;
        console.log('✓ Using first_name from bestAddress');
      }
      if (!customerLastName && addrLastName) {
        customerLastName = addrLastName;
        console.log('✓ Using last_name from bestAddress');
      }
    }
    
    console.log('Final extracted names:', {
      firstName: customerFirstName,
      lastName: customerLastName
    });

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
    // ========== DETAILNÍ ERROR LOGGING ==========
    console.error('=== CUSTOMER API ERROR (CATCH BLOCK) ===');
    console.error('Error message:', error.message);
    console.error('Error name:', error.name);
    console.error('Error stack:', error.stack);
    console.error('Error occurred at:', new Date().toISOString());
    
    // Logovat request details pro debugging
    try {
      const authData = getAuthCookie(req);
      console.error('Request context:', {
        customerId: authData?.customer?.sub,
        hasAuthData: !!authData,
        method: req.method,
        url: req.url
      });
    } catch (e) {
      console.error('Could not log request context:', e);
    }
    
    // Don't fallback to JWT data - return error instead so we can debug
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}
