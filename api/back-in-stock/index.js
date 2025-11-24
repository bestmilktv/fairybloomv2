/**
 * Back in Stock API Endpoint
 * 
 * Handles both subscription and webhook for back-in-stock notifications
 * 
 * Routes:
 * POST /api/back-in-stock/subscribe - Subscribe customer to notifications
 * POST /api/back-in-stock/webhook - Handle Shopify webhook
 */

export default async function handler(req, res) {
  const { method, url, body } = req;
  
  // Extract path from URL to determine route
  // URL format: /api/back-in-stock/subscribe or /api/back-in-stock/webhook
  const path = url.split('?')[0]; // Remove query parameters
  
  // Route to subscribe endpoint
  // Check if it's a subscription request (has email and variantId in body, but no inventory_item_id)
  if (method === 'POST' && body && body.email && body.variantId && !body.inventory_item_id) {
    return handleSubscribe(req, res);
  }
  
  // Route to webhook endpoint
  // Check if it's a webhook request (has inventory_item_id in body)
  if (method === 'POST' && body && body.inventory_item_id) {
    return handleWebhook(req, res);
  }
  
  // Also check URL path as fallback
  if (method === 'POST' && path.includes('/subscribe')) {
    return handleSubscribe(req, res);
  }
  
  if (method === 'POST' && path.includes('/webhook')) {
    return handleWebhook(req, res);
  }
  
  // Default: method not allowed
  return res.status(405).json({ error: 'Method not allowed' });
}

/**
 * Handle subscription to back-in-stock notifications
 */
async function handleSubscribe(req, res) {
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

    // Create tag for this variant: back-in-stock-{variantId}-email:{email}
    // We store email in tag because Shopify Basic plan doesn't allow access to Customer PII via API
    const tag = `back-in-stock-${numericVariantId}-email:${email}`;

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
      
      // Check if tag with this variant already exists (with any email)
      const tagPrefix = `back-in-stock-${numericVariantId}-email:`;
      const hasExistingTag = existingTags.some(t => t.startsWith(tagPrefix));
      
      if (hasExistingTag) {
        // Remove old tag and add new one (in case email changed)
        const filteredTags = existingTags.filter(t => !t.startsWith(tagPrefix));
        const updatedTags = [...filteredTags, tag].join(', ');
        
        console.log(`[BackInStock] Updating existing subscription for customer ${customerId} with new tag: ${tag}`);
        
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

        console.log(`[BackInStock] Successfully updated tag ${tag} for customer ${customerId}`);
        
        return res.status(200).json({
          success: true,
          message: 'Successfully subscribed to back-in-stock notifications'
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

/**
 * Handle webhook from Shopify
 */
async function handleWebhook(req, res) {
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
    const inventoryItemId = webhookData.inventory_item_id;
    const available = webhookData.available || webhookData.quantity || 0;
    const previousAvailable = webhookData.previous_available || webhookData.previous_quantity || 0;
    
    console.log('[BackInStock Webhook] Inventory data:', {
      inventoryItemId,
      available,
      previousAvailable,
      webhookData: JSON.stringify(webhookData, null, 2)
    });

    // Check if inventory changed from 0 (or less) to more than 0
    // If previous_available is not provided, we'll check all inventory changes
    // and process if available > 0 (this is less ideal but will work)
    const shouldProcess = (previousAvailable <= 0 && available > 0) || 
                         (previousAvailable === 0 && available > 0) ||
                         (!previousAvailable && available > 0);
    
    if (shouldProcess) {
      console.log(`[BackInStock Webhook] ✅ Inventory changed from ${previousAvailable} to ${available} for item ${inventoryItemId} - Processing...`);
      
      // Get variant ID from inventory item ID
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
        const errorText = await inventoryItemResponse.text();
        console.error(`[BackInStock Webhook] Failed to get inventory item: ${inventoryItemResponse.status}`, errorText);
        return res.status(200).json({ 
          success: true, 
          message: 'Webhook received but could not process' 
        });
      }

      const inventoryItemData = await inventoryItemResponse.json();
      console.log('[BackInStock Webhook] Inventory item data:', JSON.stringify(inventoryItemData, null, 2));
      
      // Shopify REST API returns variant_ids as an array of numeric IDs
      // But the structure might be different - let's check both possibilities
      let variantIds = [];
      
      if (inventoryItemData.inventory_item?.variant_ids) {
        variantIds = inventoryItemData.inventory_item.variant_ids;
        console.log('[BackInStock Webhook] Found variant_ids in inventory_item:', variantIds);
      } else if (inventoryItemData.inventory_item?.variant_id) {
        // Sometimes it's a single variant_id
        variantIds = [inventoryItemData.inventory_item.variant_id];
        console.log('[BackInStock Webhook] Found single variant_id:', variantIds);
      } else {
        // Try to find variants using GraphQL API as fallback
        console.log('[BackInStock Webhook] No variant_ids found, trying GraphQL API...');
        
        const graphqlQuery = `
          query getInventoryItem($id: ID!) {
            inventoryItem(id: $id) {
              id
              variant {
                id
                product {
                  id
                  title
                  handle
                }
              }
            }
          }
        `;
        
        // Convert inventory_item_id to GID format
        const inventoryItemGid = `gid://shopify/InventoryItem/${inventoryItemId}`;
        
        try {
          const graphqlUrl = `https://${storeDomain}/admin/api/${apiVersion}/graphql.json`;
          const graphqlResponse = await fetch(graphqlUrl, {
            method: 'POST',
            headers: {
              'X-Shopify-Access-Token': adminToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              query: graphqlQuery,
              variables: { id: inventoryItemGid }
            }),
          });
          
          if (graphqlResponse.ok) {
            const graphqlData = await graphqlResponse.json();
            console.log('[BackInStock Webhook] GraphQL response:', JSON.stringify(graphqlData, null, 2));
            
            if (graphqlData.data?.inventoryItem?.variant?.id) {
              const variantGid = graphqlData.data.inventoryItem.variant.id;
              // Extract numeric ID from GID
              const numericVariantId = variantGid.split('/').pop();
              variantIds = [numericVariantId];
              console.log('[BackInStock Webhook] Found variant via GraphQL:', variantIds);
            }
          }
        } catch (graphqlError) {
          console.error('[BackInStock Webhook] GraphQL API error:', graphqlError);
        }
      }

      if (variantIds.length === 0) {
        console.error('[BackInStock Webhook] No variants found for inventory item. Full response:', JSON.stringify(inventoryItemData, null, 2));
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
        // Tag format: back-in-stock-{variantId}-email:{email}
        // We search for tags starting with back-in-stock-{variantId} to find all customers
        const tagPrefix = `back-in-stock-${numericVariantId}`;
        const searchUrl = `${baseUrl}/customers/search.json?query=tag:${encodeURIComponent(tagPrefix)}`;
        
        console.log(`[BackInStock Webhook] Searching for customers with tag prefix: ${tagPrefix}`);
        
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

        console.log(`[BackInStock Webhook] Found ${customers.length} customers with tag prefix ${tagPrefix}`);

        // Send email to each customer
        for (const customer of customers) {
          try {
            console.log(`[BackInStock Webhook] Processing customer ${customer.id}...`);
            
            // Extract email from customer tags
            // Tag format: back-in-stock-{variantId}-email:{email}
            let customerEmail = null;
            const customerTags = customer.tags ? customer.tags.split(',').map(t => t.trim()) : [];
            
            console.log(`[BackInStock Webhook] Customer tags:`, customerTags);
            
            // Find tag that matches our variant and extract email
            for (const tag of customerTags) {
              if (tag.startsWith(tagPrefix + '-email:')) {
                // Extract email from tag: back-in-stock-{variantId}-email:{email}
                const emailMatch = tag.match(/-email:(.+)$/);
                if (emailMatch && emailMatch[1]) {
                  customerEmail = emailMatch[1];
                  console.log(`[BackInStock Webhook] ✅ Extracted email from tag: ${customerEmail}`);
                  break;
                }
              }
            }
            
            // Skip if no email found in tags
            if (!customerEmail) {
              console.error(`[BackInStock Webhook] ⚠️ Skipping customer ${customer.id} - no email found in tags`);
              console.error(`[BackInStock Webhook] Customer tags:`, customerTags);
              continue;
            }
            
            // Use customer name from customer data or default
            let customerFirstName = customer.first_name || '';
            let customerLastName = customer.last_name || '';
            const customerName = (customerFirstName || customerLastName) 
              ? `${customerFirstName} ${customerLastName}`.trim() 
              : 'zákazníku';
            
            console.log(`[BackInStock Webhook] ✅ Customer ${customer.id} has email: ${customerEmail}, proceeding with email send...`);
            
            // Get product image
            const productImage = product.images && product.images.length > 0 
              ? product.images[0].src 
              : null;

            // Prepare email content
            const emailSubject = `Produkt je opět skladem! - ${product.title}`;
            const productUrl = `https://${storeDomain}/products/${product.handle}`;
            
            // Get variant price (format: "123.45" from Shopify REST API)
            const variantPrice = variant.price || '0';
            const variantCurrency = 'CZK'; // Default currency, adjust if needed
            
            // Download product image if available and convert to base64 data URI
            let productImageDataUri = null;
            
            if (productImage) {
              try {
                console.log(`[BackInStock Webhook] Downloading product image: ${productImage}`);
                const imageResponse = await fetch(productImage);
                if (imageResponse.ok) {
                  const imageBuffer = await imageResponse.arrayBuffer();
                  const imageBase64 = Buffer.from(imageBuffer).toString('base64');
                  const imageContentType = imageResponse.headers.get('content-type') || 'image/jpeg';
                  
                  // Create data URI for inline image
                  productImageDataUri = `data:${imageContentType};base64,${imageBase64}`;
                  
                  const imageSizeKB = Math.round(imageBuffer.byteLength / 1024);
                  console.log(`[BackInStock Webhook] Product image prepared as data URI (${imageSizeKB}KB)`);
                  
                  // Warn if image is too large (some email clients have limits)
                  if (imageSizeKB > 1000) {
                    console.warn(`[BackInStock Webhook] Image is large (${imageSizeKB}KB), some email clients may not display it`);
                  }
                } else {
                  console.warn(`[BackInStock Webhook] Failed to download product image: ${imageResponse.status}`);
                }
              } catch (imageError) {
                console.error(`[BackInStock Webhook] Error downloading product image:`, imageError);
              }
            }
            
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
                    ${productImageDataUri ? `<img src="${productImageDataUri}" alt="${product.title}" style="width: 100%; max-width: 300px; height: auto; border-radius: 8px; margin-bottom: 15px; display: block; margin-left: auto; margin-right: auto;">` : ''}
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
                    to: customerEmail,
                    subject: emailSubject,
                    html: emailHtml
                  })
                });

                if (!emailResponse.ok) {
                  const errorData = await emailResponse.json();
                  console.error(`[BackInStock Webhook] Failed to send email to ${customerEmail}:`, errorData);
                  throw new Error(`Email service error: ${emailResponse.status}`);
                }

                const emailResult = await emailResponse.json();
                console.log(`[BackInStock Webhook] ✅ Successfully sent email to ${customerEmail} (ID: ${emailResult.id})`);
              } catch (emailError) {
                console.error(`[BackInStock Webhook] Error sending email to ${customerEmail}:`, emailError);
                // Continue with other customers even if one fails
              }
            } else {
              // Log if email service is not configured
              console.log(`[BackInStock Webhook] Email service not configured. Would send email to ${customerEmail} for product ${product.title}`);
              console.log(`[BackInStock Webhook] To enable email sending, add RESEND_API_KEY to environment variables.`);
            }

            // Remove tag after sending notification (optional)
            // Remove all tags matching back-in-stock-{variantId}-email:*
            const existingTags = customer.tags ? customer.tags.split(',').map(t => t.trim()) : [];
            const updatedTags = existingTags.filter(t => !t.startsWith(tagPrefix + '-email:')).join(', ');
            
            if (updatedTags !== customer.tags) {
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
                    tags: updatedTags
                  }
                }),
              });
              
              if (updateResponse.ok) {
                console.log(`[BackInStock Webhook] Removed back-in-stock tag from customer ${customer.id}`);
              } else {
                console.error(`[BackInStock Webhook] Failed to remove tag from customer ${customer.id}: ${updateResponse.status}`);
              }
            }

          } catch (emailError) {
            console.error(`[BackInStock Webhook] Error processing customer ${customer.email}:`, emailError);
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

