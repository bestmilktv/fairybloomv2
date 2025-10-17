/**
 * Shopify Inventory API Endpoint
 * 
 * Fetches inventory quantity for a given product variant from Shopify Admin API
 * 
 * Usage:
 * GET /api/shopify/inventory?variantGid=gid://shopify/ProductVariant/123456789
 * GET /api/shopify/inventory?variantId=123456789
 * 
 * Example curl commands:
 * curl "http://localhost:8080/api/shopify/inventory?variantGid=gid://shopify/ProductVariant/123456789"
 * curl "http://localhost:8080/api/shopify/inventory?variantId=123456789"
 * 
 * Response:
 * { "inventory_quantity": 42 }
 * 
 * Error responses:
 * 400 - Missing required parameter
 * 401 - Invalid Shopify token
 * 404 - Variant not found
 * 500 - Server error
 */

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
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

    // Get variant identifier from query parameters
    const { variantGid, variantId } = req.query;

    // Validate that at least one parameter is provided
    if (!variantGid && !variantId) {
      return res.status(400).json({ 
        error: 'Missing required parameter: variantGid or variantId' 
      });
    }

    // Extract numeric variant ID
    let numericVariantId;
    
    if (variantGid) {
      // Extract ID from GID format: gid://shopify/ProductVariant/123456789
      const gidParts = variantGid.split('/');
      numericVariantId = gidParts[gidParts.length - 1];
      
      // Validate GID format
      if (!numericVariantId || isNaN(numericVariantId)) {
        return res.status(400).json({ 
          error: 'Invalid variantGid format. Expected: gid://shopify/ProductVariant/123456789' 
        });
      }
    } else {
      // Use variantId directly
      numericVariantId = variantId;
      
      // Validate numeric ID
      if (isNaN(numericVariantId)) {
        return res.status(400).json({ 
          error: 'Invalid variantId format. Expected numeric value' 
        });
      }
    }

    // Construct Shopify Admin API URL
    const shopifyUrl = `https://${storeDomain}/admin/api/2023-10/variants/${numericVariantId}.json`;

    // Make request to Shopify Admin API
    const shopifyResponse = await fetch(shopifyUrl, {
      method: 'GET',
      headers: {
        'X-Shopify-Access-Token': adminToken,
        'Content-Type': 'application/json',
      },
    });

    // Handle Shopify API response
    if (!shopifyResponse.ok) {
      const errorText = await shopifyResponse.text();
      console.error(`Shopify API error: ${shopifyResponse.status} - ${errorText}`);
      
      // Forward Shopify API status codes
      if (shopifyResponse.status === 401) {
        return res.status(401).json({ 
          error: 'Invalid Shopify Admin API token' 
        });
      } else if (shopifyResponse.status === 404) {
        return res.status(404).json({ 
          error: 'Variant not found' 
        });
      } else {
        return res.status(shopifyResponse.status).json({ 
          error: `Shopify API error: ${shopifyResponse.statusText}` 
        });
      }
    }

    // Parse Shopify response
    const variantData = await shopifyResponse.json();
    
    // Extract inventory quantity
    const inventoryQuantity = variantData.variant?.inventory_quantity || 0;

    // Return inventory quantity
    return res.status(200).json({
      inventory_quantity: inventoryQuantity
    });

  } catch (error) {
    console.error('Inventory API error:', error);
    
    // Return generic server error
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}








