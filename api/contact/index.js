/**
 * Contact Form API Endpoint
 * 
 * Handles contact form submissions and sends email via Resend
 * 
 * Usage:
 * POST /api/contact
 * Body: { "name": "John Doe", "email": "john@example.com", "subject": "Question", "message": "Hello" }
 */

export default async function handler(req, res) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get environment variables
    const emailApiKey = process.env.RESEND_API_KEY;
    const recipientEmail = process.env.CONTACT_EMAIL || 'info@fairybloom.cz';

    // Get form data from request body
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
                <!-- Header -->
                <tr>
                  <td style="background: linear-gradient(135deg, #8B7355 0%, #A68B6B 100%); padding: 40px 30px; text-align: center;">
                    <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600; letter-spacing: -0.5px;">
                      Nová zpráva z kontaktního formuláře
                    </h1>
                  </td>
                </tr>
                
                <!-- Content -->
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
                    
                    <!-- Footer -->
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
      // Log if email service is not configured
      console.log('[Contact Form] Email service not configured. Would send email:', {
        from: email,
        to: recipientEmail,
        subject,
        message
      });
      console.log('[Contact Form] To enable email sending, add RESEND_API_KEY to environment variables.');
      
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
