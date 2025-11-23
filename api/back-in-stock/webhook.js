/**
 * Back in Stock Webhook Handler
 * 
 * Handles webhook from Shopify when inventory levels change
 * Finds customers with back-in-stock tags and sends them email notifications
 * 
 * Usage:
 * POST /api/back-in-stock/webhook
 * Body: Shopify webhook payload for inventory_levels/update
 * 
 * This endpoint should be called by Shopify webhook when inventory changes
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
    const emailApiKey = process.env.RESEND_API_KEY; // Optional: for Resend email service

    // Validate environment variables
    if (!storeDomain || !adminToken) {
      console.error('Missing required environment variables');
      return res.status(500).json({ 
        error: 'Server configuration error: Missing Shopify credentials' 
      });
    }

    // Get webhook payload from Shopify
    const webhookData = req.body;
    
    console.log('[BackInStock Webhook] Received webhook:', JSON.stringify(webhookData, null, 2));

    // Extract variant ID and inventory quantity from webhook
    // Shopify webhook format for inventory_levels/update:
    // {
    //   "inventory_item_id": 123456789,
    //   "location_id": 123456789,
    //   "available": 10,
    //   "updated_at": "2024-01-01T00:00:00Z"
    // }
    
    const inventoryItemId = webhookData.inventory_item_id;
    const available = webhookData.available;
    const previousAvailable = webhookData.previous_available || 0;

    // Check if inventory changed from 0 (or less) to more than 0
    if (previousAvailable <= 0 && available > 0) {
      console.log(`[BackInStock Webhook] Inventory changed from ${previousAvailable} to ${available} for item ${inventoryItemId}`);
      
      // Get variant ID from inventory item ID
      // We need to query Shopify to get variant(s) associated with this inventory item
      const apiVersion = '2024-04';
      const baseUrl = `https://${storeDomain}/admin/api/${apiVersion}`;
      
      // Get inventory item to find associated variants
      const inventoryItemUrl = `${baseUrl}/inventory_items/${inventoryItemId}.json`;
      const inventoryItemResponse = await fetch(inventoryItemUrl, {
        method: 'GET',
        headers: {
          'X-Shopify-Access-Token': adminToken,
          'Content-Type': 'application/json',
        },
      });

      if (!inventoryItemResponse.ok) {
        console.error(`[BackInStock Webhook] Failed to get inventory item: ${inventoryItemResponse.status}`);
        return res.status(200).json({ 
          success: true, 
          message: 'Webhook received but could not process' 
        });
      }

      const inventoryItemData = await inventoryItemResponse.json();
      const variantIds = inventoryItemData.inventory_item?.variant_ids || [];

      if (variantIds.length === 0) {
        console.log('[BackInStock Webhook] No variants found for inventory item');
        return res.status(200).json({ 
          success: true, 
          message: 'No variants found' 
        });
      }

      // Process each variant
      for (const variantId of variantIds) {
        // Extract numeric variant ID
        const numericVariantId = typeof variantId === 'string' && variantId.startsWith('gid://')
          ? variantId.split('/').pop()
          : variantId;

        // Get variant details to get product info
        const variantUrl = `${baseUrl}/variants/${numericVariantId}.json`;
        const variantResponse = await fetch(variantUrl, {
          method: 'GET',
          headers: {
            'X-Shopify-Access-Token': adminToken,
            'Content-Type': 'application/json',
          },
        });

        if (!variantResponse.ok) {
          console.error(`[BackInStock Webhook] Failed to get variant ${numericVariantId}`);
          continue;
        }

        const variantData = await variantResponse.json();
        const variant = variantData.variant;
        const productId = variant.product_id;

        // Get product details
        const productUrl = `${baseUrl}/products/${productId}.json`;
        const productResponse = await fetch(productUrl, {
          method: 'GET',
          headers: {
            'X-Shopify-Access-Token': adminToken,
            'Content-Type': 'application/json',
          },
        });

        if (!productResponse.ok) {
          console.error(`[BackInStock Webhook] Failed to get product ${productId}`);
          continue;
        }

        const productData = await productResponse.json();
        const product = productData.product;

        // Find customers with tag for this variant
        const tag = `back-in-stock-${numericVariantId}`;
        const searchUrl = `${baseUrl}/customers/search.json?query=tag:${encodeURIComponent(tag)}`;
        
        console.log(`[BackInStock Webhook] Searching for customers with tag: ${tag}`);
        
        const customersResponse = await fetch(searchUrl, {
          method: 'GET',
          headers: {
            'X-Shopify-Access-Token': adminToken,
            'Content-Type': 'application/json',
          },
        });

        if (!customersResponse.ok) {
          console.error(`[BackInStock Webhook] Failed to search customers: ${customersResponse.status}`);
          continue;
        }

        const customersData = await customersResponse.json();
        const customers = customersData.customers || [];

        console.log(`[BackInStock Webhook] Found ${customers.length} customers with tag ${tag}`);

        // Send email to each customer
        for (const customer of customers) {
          try {
            // Get product image
            const productImage = product.images && product.images.length > 0 
              ? product.images[0].src 
              : null;

            // Prepare email content
            const emailSubject = `Produkt je opět skladem! - ${product.title}`;
            const productUrl = `https://${storeDomain}/products/${product.handle}`;
            const customerName = customer.first_name || customer.last_name 
              ? `${customer.first_name || ''} ${customer.last_name || ''}`.trim() 
              : 'zákazníku';
            
            // Get variant price (format: "123.45" from Shopify REST API)
            const variantPrice = variant.price || '0';
            const variantCurrency = 'CZK'; // Default currency, adjust if needed
            
            // Create email HTML template
            const emailHtml = `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
              </head>
              <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background: linear-gradient(135deg, #f5f5f5 0%, #ffffff 100%); padding: 30px; border-radius: 10px;">
                  <h1 style="color: #8B7355; font-size: 24px; margin-bottom: 20px;">Ahoj ${customerName},</h1>
                  
                  <p style="font-size: 16px; margin-bottom: 20px;">
                    Máme radostnou zprávu! Produkt, který jste si přál/a sledovat, je opět skladem:
                  </p>
                  
                  <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    ${productImage ? `<img src="${productImage}" alt="${product.title}" style="width: 100%; max-width: 300px; height: auto; border-radius: 8px; margin-bottom: 15px;">` : ''}
                    <h2 style="color: #333; font-size: 20px; margin-bottom: 10px;">${product.title}</h2>
                    <p style="font-size: 18px; color: #8B7355; font-weight: bold; margin: 10px 0;">
                      ${parseFloat(variantPrice).toLocaleString('cs-CZ')} ${variantCurrency}
                    </p>
                  </div>
                  
                  <div style="text-align: center; margin: 30px 0;">
                    <a href="${productUrl}" style="display: inline-block; background-color: #8B7355; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; font-size: 16px;">
                      Zobrazit produkt
                    </a>
                  </div>
                  
                  <p style="font-size: 14px; color: #666; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                    S pozdravem,<br>
                    <strong>Tým FairyBloom</strong>
                  </p>
                </div>
              </body>
              </html>
            `;
            
            // Send email using Resend (if API key is configured)
            if (emailApiKey) {
              try {
                const emailResponse = await fetch('https://api.resend.com/emails', {
                  method: 'POST',
                  headers: {
                    'Authorization': `Bearer ${emailApiKey}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    from: 'FairyBloom <noreply@fairybloom.cz>',
                    to: customer.email,
                    subject: emailSubject,
                    html: emailHtml
                  })
                });

                if (!emailResponse.ok) {
                  const errorData = await emailResponse.json();
                  console.error(`[BackInStock Webhook] Failed to send email to ${customer.email}:`, errorData);
                  throw new Error(`Email service error: ${emailResponse.status}`);
                }

                const emailResult = await emailResponse.json();
                console.log(`[BackInStock Webhook] Successfully sent email to ${customer.email} (ID: ${emailResult.id})`);
              } catch (emailError) {
                console.error(`[BackInStock Webhook] Error sending email to ${customer.email}:`, emailError);
                // Continue with other customers even if one fails
              }
            } else {
              // Log if email service is not configured
              console.log(`[BackInStock Webhook] Email service not configured. Would send email to ${customer.email} for product ${product.title}`);
              console.log(`[BackInStock Webhook] To enable email sending, add RESEND_API_KEY to environment variables.`);
            }

            // Remove tag after sending notification (optional)
            const existingTags = customer.tags ? customer.tags.split(',').map(t => t.trim()) : [];
            const updatedTags = existingTags.filter(t => t !== tag).join(', ');
            
            if (updatedTags !== customer.tags) {
              const updateUrl = `${baseUrl}/customers/${customer.id}.json`;
              await fetch(updateUrl, {
                method: 'PUT',
                headers: {
                  'X-Shopify-Access-Token': adminToken,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  customer: {
                    id: customer.id,
                    tags: updatedTags
                  }
                }),
              });
              
              console.log(`[BackInStock Webhook] Removed tag ${tag} from customer ${customer.id}`);
            }

          } catch (emailError) {
            console.error(`[BackInStock Webhook] Error sending email to ${customer.email}:`, emailError);
            // Continue with other customers
          }
        }
      }

      return res.status(200).json({ 
        success: true, 
        message: 'Webhook processed successfully' 
      });
    } else {
      // Inventory didn't change from 0 to >0, ignore
      console.log(`[BackInStock Webhook] Inventory change doesn't trigger notification (${previousAvailable} -> ${available})`);
      return res.status(200).json({ 
        success: true, 
        message: 'No notification needed' 
      });
    }

  } catch (error) {
    console.error('[BackInStock Webhook] Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}

