/**
 * Shopify Newsletter Subscription API Endpoint
 * 
 * Handles newsletter subscription by creating/updating customers in Shopify
 * with accepts_marketing: true
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

    // Use Shopify Admin API version (consistent with other endpoints)
    const apiVersion = '2023-10';
    const baseUrl = `https://${storeDomain}/admin/api/${apiVersion}`;

    // Step 1: Try to find existing customer by email
    const searchUrl = `${baseUrl}/customers/search.json?query=email:${encodeURIComponent(email)}`;
    
    const searchResponse = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': adminToken,
        'Content-Type': 'application/json',
      },
    });

    if (!searchResponse.ok) {
      if (searchResponse.status === 401) {
        return res.status(401).json({ 
          error: 'Invalid Shopify Admin API token' 
        });
      }
      const errorText = await searchResponse.text();
      console.error(`Shopify API search error: ${searchResponse.status} - ${errorText}`);
      return res.status(searchResponse.status).json({ 
        error: `Shopify API error: ${searchResponse.statusText}` 
      });
    }

    const searchData = await searchResponse.json();
    const existingCustomers = searchData.customers || [];

    // Step 2: Update existing customer or create new one
    if (existingCustomers.length > 0) {
      // Customer exists - update to accept marketing
      const customer = existingCustomers[0];
      
      // Check if already accepts marketing
      if (customer.accepts_marketing) {
        return res.status(409).json({ 
          error: 'This email is already subscribed to the newsletter' 
        });
      }

      // Update customer
      const updateUrl = `${baseUrl}/customers/${customer.id}.json`;
      const updateResponse = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'X-Shopify-Access-Token': adminToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer: {
            id: customer.id,
            accepts_marketing: true,
          }
        }),
      });

      if (!updateResponse.ok) {
        const errorText = await updateResponse.text();
        console.error(`Shopify API update error: ${updateResponse.status} - ${errorText}`);
        return res.status(updateResponse.status).json({ 
          error: `Failed to update customer: ${updateResponse.statusText}` 
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Successfully subscribed to newsletter'
      });
    } else {
      // Customer doesn't exist - create new customer with marketing consent
      const createUrl = `${baseUrl}/customers.json`;
      const createResponse = await fetch(createUrl, {
        method: 'POST',
        headers: {
          'X-Shopify-Access-Token': adminToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customer: {
            email: email,
            accepts_marketing: true,
            // Create as newsletter subscriber (no first/last name required)
          }
        }),
      });

      if (!createResponse.ok) {
        const errorData = await createResponse.json();
        console.error(`Shopify API create error: ${createResponse.status}`, errorData);
        
        // Handle duplicate email error
        if (createResponse.status === 422 && errorData.errors?.email) {
          return res.status(409).json({ 
            error: 'This email is already registered' 
          });
        }
        
        return res.status(createResponse.status).json({ 
          error: `Failed to create customer: ${createResponse.statusText}` 
        });
      }

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

