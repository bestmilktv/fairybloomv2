# Shopify Customer Account API SSO Setup Guide

This guide explains how to set up Shopify Customer Account API with OAuth 2.0 + PKCE for secure single sign-on authentication.

## Prerequisites

- Shopify store with Customer Account API enabled
- Vercel account for deployment
- Domain configured for subdomain cookie sharing

## 1. Shopify App Configuration

### Step 1: Create Customer Account API App

1. Navigate to your Shopify Admin → Settings → Apps and sales channels
2. Click "Develop apps" → "Create an app"
3. Name your app: "FairyBloom Customer Auth"
4. Click "Create app"

### Step 2: Configure Customer Account API

1. In your app, go to "Configuration" tab
2. Under "Customer Account API", click "Configure"
3. Enable the following scopes:
   - `openid` - Required for OAuth
   - `email` - Access to customer email
   - `profile` - Access to customer profile data
4. Add redirect URLs:
   - Development: `http://localhost:8080/api/auth/callback`
   - Production: `https://fairybloom.cz/api/auth/callback`
5. Save the configuration

### Step 3: Get Credentials

1. In your app, go to "API credentials" tab
2. Copy the following values:
   - **Client ID** (safe to expose in frontend)
   - **Client Secret** (keep secure, backend only)
3. Note your **Shop ID** from the app URL or admin panel

## 2. Environment Variables

Create a `.env` file in your project root with the following variables:

```env
# Shopify Store Configuration
VITE_SHOPIFY_STORE_DOMAIN=your-shop.myshopify.com
VITE_SHOPIFY_STOREFRONT_TOKEN=your_storefront_access_token

# Shopify Customer Account API OAuth Configuration
SHOPIFY_OAUTH_CLIENT_ID=your_oauth_client_id
SHOPIFY_OAUTH_CLIENT_SECRET=your_oauth_client_secret
SHOPIFY_SHOP_ID=your_shop_id

# Frontend OAuth Configuration (safe to expose)
VITE_SHOPIFY_OAUTH_CLIENT_ID=your_oauth_client_id
VITE_SHOPIFY_SHOP_ID=your_shop_id

# Application URLs
VITE_APP_URL=http://localhost:8080
# For production: VITE_APP_URL=https://fairybloom.cz

# Shopify Admin API (for inventory)
SHOPIFY_ADMIN_API_TOKEN=your_admin_api_token
```

## 3. Vercel Deployment Configuration

### Step 1: Deploy to Vercel

1. Connect your GitHub repository to Vercel
2. Deploy the project

### Step 2: Configure Environment Variables in Vercel

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add all the environment variables from your `.env` file
4. Set `VITE_APP_URL` to `https://fairybloom.cz` for production

### Step 3: Update Shopify App Redirect URLs

1. Go back to your Shopify app configuration
2. Update the production redirect URL to: `https://fairybloom.cz/api/auth/callback`
3. Save the configuration

## 4. Domain Configuration

### Subdomain Cookie Sharing

For automatic checkout login, ensure your domain supports subdomain cookie sharing:

1. **Main domain**: `fairybloom.cz`
2. **Checkout subdomain**: `pokladna.fairybloom.cz`
3. **Cookie domain**: `.fairybloom.cz` (note the leading dot)

The implementation automatically sets cookies with `Domain=.fairybloom.cz` to enable sharing between subdomains.

## 5. Testing the Implementation

### Local Development

1. Start the development server: `npm run dev`
2. Navigate to `http://localhost:8080`
3. Click the login button in the navigation
4. Test the OAuth popup flow
5. Verify customer data is loaded after successful login

### Production Testing

1. Deploy to Vercel
2. Test the OAuth flow on the live site
3. Verify checkout auto-login by:
   - Logging in on `fairybloom.cz`
   - Adding items to cart
   - Going to checkout on `pokladna.fairybloom.cz`
   - Confirming you're automatically logged in

## 6. Security Features

The implementation includes the following security measures:

- **PKCE (Proof Key for Code Exchange)**: Prevents authorization code interception
- **CSRF Protection**: State parameter validation
- **Secure Cookies**: HTTP-only, secure, SameSite=Lax
- **Origin Validation**: PostMessage origin verification
- **Token Security**: Access tokens stored server-side only

## 7. Troubleshooting

### Common Issues

1. **Popup Blocked**: Ensure popups are allowed for your domain
2. **Invalid Redirect URI**: Check that redirect URLs match exactly in Shopify app config
3. **Cookie Not Set**: Verify domain configuration and HTTPS in production
4. **CORS Errors**: Check Vercel configuration and API endpoint setup

### Debug Mode

Enable debug logging by checking browser console and Vercel function logs.

## 8. API Endpoints

The implementation creates the following API endpoints:

- `GET /api/auth/callback` - OAuth callback handler
- `GET /api/auth/customer` - Customer data endpoint
- `POST /api/auth/logout` - Logout endpoint

All endpoints are configured in `vercel.json` with appropriate CORS headers.

## 9. Migration from Storefront API

The old Storefront API authentication has been completely replaced. The new system:

- Uses Customer Account API instead of Storefront API
- Implements OAuth 2.0 + PKCE instead of email/password
- Stores tokens in HTTP-only cookies instead of localStorage
- Provides better security and user experience

## Support

For issues or questions, refer to:
- [Shopify Customer Account API Documentation](https://shopify.dev/docs/api/customer)
- [OAuth 2.0 + PKCE Specification](https://tools.ietf.org/html/rfc7636)
- [Vercel Serverless Functions Documentation](https://vercel.com/docs/functions)
