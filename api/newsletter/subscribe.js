/**
 * Universal Email API Endpoint
 * 
 * Handles both newsletter subscription and contact form submissions
 * 
 * Newsletter Usage:
 * POST /api/newsletter/subscribe
 * Body: { "email": "customer@example.com" }
 * 
 * Contact Form Usage:
 * POST /api/newsletter/subscribe
 * Body: { "type": "contact", "name": "John", "email": "john@example.com", "subject": "Question", "message": "Hello" }
 * 
 * Response:
 * { "success": true, "message": "Successfully subscribed to newsletter" }
 * or
 * { "success": true, "message": "Zpráva byla úspěšně odeslána" }
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

  const { type } = req.body;

  // Route to contact form handler
  if (type === 'contact') {
    return handleContactForm(req, res);
  }

  // Default: newsletter subscription (existing logic)
  return handleNewsletterSubscription(req, res);
}

/**
 * Handle contact form submission
 */
async function handleContactForm(req, res) {
  try {
    const emailApiKey = process.env.RESEND_API_KEY;
    const recipientEmail = process.env.CONTACT_EMAIL || 'info@fairybloom.cz';
    const { name, email, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !message) {
      return res.status(400).json({ 
        error: 'Jméno, email a zpráva jsou povinné' 
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ 
        error: 'Neplatný formát emailu' 
      });
    }

    // Sanitize HTML to prevent XSS
    const sanitizeHtml = (str) => {
      if (!str) return '';
      return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    };

    const sanitizedName = sanitizeHtml(name);
    const sanitizedEmail = sanitizeHtml(email);
    const sanitizedSubject = sanitizeHtml(subject || '');
    const sanitizedMessage = sanitizeHtml(message).replace(/\n/g, '<br>');

    // Create email HTML template
    const emailHtml = `
      <!DOCTYPE html>
      <html lang="cs">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa; line-height: 1.6;">
        <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f8f9fa; padding: 20px 0;">
          <tr>
            <td align="center" style="padding: 20px 0;">
              <table role="presentation" style="width: 100%; max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <tr>
                  <td style="background: linear-gradient(135deg, #8B7355 0%, #A68B6B 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
                      Nová zpráva z kontaktního formuláře
                    </h1>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 40px 30px;">
                    <div style="margin-bottom: 30px;">
                      <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                        Od
                      </p>
                      <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px;">
                        ${sanitizedName} (${sanitizedEmail})
                      </p>
                    </div>
                    ${sanitizedSubject ? `
                    <div style="margin-bottom: 30px;">
                      <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                        Předmět
                      </p>
                      <p style="margin: 0 0 20px 0; color: #333333; font-size: 16px;">
                        ${sanitizedSubject}
                      </p>
                    </div>
                    ` : ''}
                    <div style="margin-bottom: 30px;">
                      <p style="margin: 0 0 10px 0; color: #666666; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">
                        Zpráva
                      </p>
                      <div style="margin: 0; color: #333333; font-size: 16px; line-height: 1.8; white-space: pre-wrap;">
                        ${sanitizedMessage}
                      </div>
                    </div>
                    <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #e9ecef;">
                      <p style="margin: 0 0 8px 0; color: #666666; font-size: 14px; line-height: 1.5;">
                        Tento email byl odeslán z kontaktního formuláře na webu fairybloom.cz
                      </p>
                      <p style="margin: 0; color: #8B7355; font-size: 14px; font-weight: 600;">
                        FairyBloom
                      </p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    // Send email using Resend
    if (emailApiKey) {
      try {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${emailApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: 'FairyBloom Kontaktní formulář <noreply@fairybloom.cz>',
            to: recipientEmail,
            replyTo: email,
            subject: sanitizedSubject ? `Kontaktní formulář: ${sanitizedSubject}` : 'Nová zpráva z kontaktního formuláře',
            html: emailHtml
          })
        });

        if (!emailResponse.ok) {
          const errorData = await emailResponse.json();
          console.error('[Contact Form] Failed to send email:', errorData);
          throw new Error(`Email service error: ${emailResponse.status}`);
        }

        const emailResult = await emailResponse.json();
        console.log(`[Contact Form] ✅ Successfully sent email (ID: ${emailResult.id})`);
        
        return res.status(200).json({ 
          success: true, 
          message: 'Zpráva byla úspěšně odeslána' 
        });
      } catch (emailError) {
        console.error('[Contact Form] Error sending email:', emailError);
        return res.status(500).json({ 
          error: 'Nepodařilo se odeslat email. Zkuste to prosím znovu později.' 
        });
      }
    } else {
      console.log('[Contact Form] Email service not configured.');
      return res.status(500).json({ 
        error: 'Email service není nakonfigurován. Kontaktujte prosím administrátora.' 
      });
    }
  } catch (error) {
    console.error('[Contact Form] Unexpected error:', error);
    return res.status(500).json({ 
      error: 'Nastala neočekávaná chyba. Zkuste to prosím znovu.' 
    });
  }
}

/**
 * Handle newsletter subscription (existing logic)
 */
async function handleNewsletterSubscription(req, res) {
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

