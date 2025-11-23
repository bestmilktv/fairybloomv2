/**
 * Back in Stock Notification Subscription API Endpoint
 * 
 * Handles subscription to back-in-stock notifications by adding a tag to customer
 * 
 * Usage:
 * POST /api/back-in-stock/subscribe
 * Body: { "email": "customer@example.com", "variantId": "gid://shopify/ProductVariant/123456789" }
 * 
 * Response:
 * { "success": true, "message": "Successfully subscribed to back-in-stock notifications" }
 * 
 * Error responses:
 * 400 - Invalid email format or missing required fields
 * 401 - Invalid Shopify Admin API token
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

    // Get data from request body
    const { email, variantId } = req.body;

    // Validate required fields
    if (!email) {
      return res.status(400).json({ 
        error: 'Email is required' 
      });
    }

    if (!variantId) {
      return res.status(400).json({ 
        error: 'Variant ID is required' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Invalid email format' 
      });
    }

    // Extract numeric variant ID from GID format if needed
    let numericVariantId = variantId;
    if (variantId.startsWith('gid://')) {
      const parts = variantId.split('/');
      numericVariantId = parts[parts.length - 1];
    }

    // Use Shopify Admin API version 2024-04
    const apiVersion = '2024-04';
    const baseUrl = `https://${storeDomain}/admin/api/${apiVersion}`;

    // Create tag for this variant: back-in-stock-{variantId}
    const tag = `back-in-stock-${numericVariantId}`;

    // Step 1: Find existing customer by email
    const searchUrl = `${baseUrl}/customers/search.json?query=email:${encodeURIComponent(email)}`;
    
    console.log(`[BackInStock] Searching for customer with email: ${email}`);
    
    const searchResponse = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': adminToken,
        'Content-Type': 'application/json',
      },
    });

    if (!searchResponse.ok) {
      if (searchResponse.status === 401) {
        console.error('[BackInStock] Invalid Shopify Admin API token');
        return res.status(401).json({ 
          error: 'Invalid Shopify Admin API token' 
        });
      }
      const errorText = await searchResponse.text();
      console.error(`[BackInStock] Shopify API search error: ${searchResponse.status} - ${errorText}`);
      return res.status(searchResponse.status).json({ 
        error: `Shopify API error: ${searchResponse.statusText}` 
      });
    }

    const searchData = await searchResponse.json();
    const existingCustomers = searchData.customers || [];
    
    if (existingCustomers.length > 0) {
      // Customer exists - update tags
      const customer = existingCustomers[0];
      const customerId = customer.id;
      
      // Get existing tags
      const existingTags = customer.tags ? customer.tags.split(',').map(t => t.trim()) : [];
      
      // Check if tag already exists
      if (existingTags.includes(tag)) {
        return res.status(200).json({
          success: true,
          message: 'Already subscribed to back-in-stock notifications for this product'
        });
      }
      
      // Add new tag
      const updatedTags = [...existingTags, tag].join(', ');
      
      console.log(`[BackInStock] Updating customer ${customerId} with tag: ${tag}`);
      
      const updateUrl = `${baseUrl}/customers/${customerId}.json`;
      const updatePayload = {
        customer: {
          id: customerId,
          tags: updatedTags
        }
      };
      
      const updateResponse = await fetch(updateUrl, {
        method: 'PUT',
        headers: {
          'X-Shopify-Access-Token': adminToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updatePayload),
      });

      if (!updateResponse.ok) {
        const errorData = await updateResponse.json();
        console.error(`[BackInStock] Shopify API update error: ${updateResponse.status}:`, JSON.stringify(errorData, null, 2));
        return res.status(updateResponse.status).json({ 
          error: 'Failed to update customer tags',
          details: errorData
        });
      }

      console.log(`[BackInStock] Successfully added tag ${tag} to customer ${customerId}`);
      
      return res.status(200).json({
        success: true,
        message: 'Successfully subscribed to back-in-stock notifications'
      });
    } else {
      // Customer doesn't exist - create new customer with tag
      const createUrl = `${baseUrl}/customers.json`;
      const createPayload = {
        customer: {
          email: email,
          tags: tag
        }
      };
      
      console.log(`[BackInStock] Creating new customer with tag: ${tag}`);
      
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
        console.error(`[BackInStock] Shopify API create error: ${createResponse.status}:`, JSON.stringify(errorData, null, 2));
        
        // Handle duplicate email error
        if (createResponse.status === 422 && errorData.errors?.email) {
          return res.status(409).json({ 
            error: 'This email is already registered. Please try again.' 
          });
        }
        
        return res.status(createResponse.status).json({ 
          error: 'Failed to create customer',
          details: errorData
        });
      }

      const createResult = await createResponse.json();
      console.log(`[BackInStock] Successfully created customer ${createResult.customer?.id} with tag ${tag}`);

      return res.status(200).json({
        success: true,
        message: 'Successfully subscribed to back-in-stock notifications'
      });
    }

  } catch (error) {
    console.error('[BackInStock] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

