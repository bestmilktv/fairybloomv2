/**
 * Shopify Newsletter Subscription API Endpoint
 * 
 * Handles newsletter subscription by creating/updating customers in Shopify
 * with email_marketing_consent (state: "subscribed")
 * 
 * Usage:
 * POST /api/newsletter/subscribe
 * Body: { "email": "customer@example.com" }
 * 
 * Response:
 * { "success": true, "message": "Successfully subscribed to newsletter" }
 * 
 * Error responses:
 * 400 - Invalid email format or missing email
 * 401 - Invalid Shopify Admin API token
 * 409 - Email already subscribed
 * 500 - Server error
 */

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get environment variables
    const storeDomain = process.env.VITE_SHOPIFY_STORE_DOMAIN;
    const adminToken = process.env.SHOPIFY_ADMIN_API_TOKEN;

    // Validate environment variables
    if (!storeDomain || !adminToken) {
      console.error('Missing required environment variables');
      return res.status(500).json({ 
        error: 'Server configuration error: Missing Shopify credentials' 
      });
    }

    // Get email from request body
    const { email } = req.body;

    // Validate email is provided
    if (!email) {
      return res.status(400).json({ 
        error: 'Email is required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format' 
      });
    }

    // Use Shopify Admin API version 2024-04 (supports email_marketing_consent)
    const apiVersion = '2024-04';
    const baseUrl = `https://${storeDomain}/admin/api/${apiVersion}`;

    // Prepare email_marketing_consent object with current timestamp
    const consentTimestamp = new Date().toISOString();
    const emailMarketingConsent = {
      state: 'subscribed',
      opt_in_level: 'confirmed_opt_in',
      consent_updated_at: consentTimestamp
    };

    // Step 1: Try to find existing customer by email
    // Use search API or fallback to listing with email filter
    const searchUrl = `${baseUrl}/customers/search.json?query=email:${encodeURIComponent(email)}`;
    
    console.log(`[Newsletter] Searching for customer with email: ${email}`);
    
    const searchResponse = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': adminToken,
        'Content-Type': 'application/json',
      },
    });

    if (!searchResponse.ok) {
      if (searchResponse.status === 401) {
        console.error('[Newsletter] Invalid Shopify Admin API token');
        return res.status(401).json({ 
          error: 'Invalid Shopify Admin API token' 
        });
      }
      const errorText = await searchResponse.text();
      console.error(`[Newsletter] Shopify API search error: ${searchResponse.status} - ${errorText}`);
      return res.status(searchResponse.status).json({ 
        error: `Shopify API error: ${searchResponse.statusText}` 
      });
    }

    const searchData = await searchResponse.json();
    const existingCustomers = searchData.customers || [];
    
    console.log(`[Newsletter] Found ${existingCustomers.length} existing customer(s)`);

    // Step 2: Update existing customer or create new one
    if (existingCustomers.length > 0) {
      // Customer exists - update to accept marketing
      const customer = existingCustomers[0];
      
      console.log(`[Newsletter] Customer found with ID: ${customer.id}, current marketing consent:`, customer.email_marketing_consent);
      
      // Check if already subscribed to marketing
      if (customer.email_marketing_consent?.state === 'subscribed') {
        console.log(`[Newsletter] Customer ${customer.id} is already subscribed`);
        return res.status(409).json({ 
          error: 'This email is already subscribed to the newsletter' 
        });
      }

      // Update customer with email_marketing_consent
      const updateUrl = `${baseUrl}/customers/${customer.id}.json`;
      const updatePayload = {
        customer: {
          id: customer.id,
          email_marketing_consent: emailMarketingConsent
        }
      };
      
      console.log(`[Newsletter] Updating customer ${customer.id} with:`, JSON.stringify(updatePayload, null, 2));
      
      const updateResponse = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'X-Shopify-Access-Token': adminToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error(`[Newsletter] Shopify API update error: ${updateResponse.status} - ${errorText}`);
        
        // Try to parse error details
        let errorDetails = errorText;
        try {
          const errorData = JSON.parse(errorText);
          errorDetails = errorData.errors ? JSON.stringify(errorData.errors) : errorText;
        } catch (e) {
          // Keep errorText as is
        }
        
        return res.status(updateResponse.status).json({ 
          error: `Failed to update customer: ${updateResponse.statusText}`,
          details: errorDetails
        });
      }

      const updateResult = await updateResponse.json();
      console.log(`[Newsletter] Successfully updated customer ${customer.id}:`, updateResult.customer?.email_marketing_consent);

      return res.status(200).json({
        success: true,
        message: 'Successfully subscribed to newsletter'
      });
    } else {
      // Customer doesn't exist - create new customer with marketing consent
      const createUrl = `${baseUrl}/customers.json`;
      const createPayload = {
        customer: {
          email: email,
          email_marketing_consent: emailMarketingConsent
        }
      };
      
      console.log(`[Newsletter] Creating new customer with:`, JSON.stringify(createPayload, null, 2));
      
      const createResponse = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': adminToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(createPayload),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        console.error(`[Newsletter] Shopify API create error: ${createResponse.status}:`, JSON.stringify(errorData, null, 2));
        
        // Handle duplicate email error
        if (createResponse.status === 422 && errorData.errors?.email) {
          return res.status(409).json({ 
            error: 'This email is already registered' 
          });
        }
        
        // Return detailed error
        const errorMessage = errorData.errors 
          ? Object.entries(errorData.errors).map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(', ') : value}`).join('; ')
          : `Failed to create customer: ${createResponse.statusText}`;
        
        return res.status(createResponse.status).json({ 
          error: errorMessage,
          details: errorData
        });
      }

      const createResult = await createResponse.json();
      console.log(`[Newsletter] Successfully created customer ${createResult.customer?.id} with marketing consent:`, createResult.customer?.email_marketing_consent);

      return res.status(200).json({
        success: true,
        message: 'Successfully subscribed to newsletter'
      });
    }

  } catch (error) {
    console.error('Newsletter subscription API error:', error);
    
    // Return generic server error
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

