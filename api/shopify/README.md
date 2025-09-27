# Shopify Inventory API

This API endpoint provides serverless access to Shopify inventory data using the Admin API.

## Endpoint

```
GET /api/shopify/inventory
```

## Parameters

- `variantGid` (optional): Shopify variant GID format
  - Example: `gid://shopify/ProductVariant/123456789`
- `variantId` (optional): Plain numeric variant ID
  - Example: `123456789`

**Note**: Either `variantGid` or `variantId` must be provided.

## Environment Variables Required

Add these to your `.env.local` file:

```env
VITE_SHOPIFY_STORE_DOMAIN=your-store.myshopify.com
SHOPIFY_ADMIN_API_TOKEN=your-admin-api-token
```

## Usage Examples

### Using variantGid
```bash
curl "http://localhost:8080/api/shopify/inventory?variantGid=gid://shopify/ProductVariant/123456789"
```

### Using variantId
```bash
curl "http://localhost:8080/api/shopify/inventory?variantId=123456789"
```

### JavaScript/TypeScript
```typescript
import { getVariantInventory } from '@/lib/shopify';

// Using variantGid
const inventory = await getVariantInventory('gid://shopify/ProductVariant/123456789');

// Using variantId
const inventory = await getVariantInventory(undefined, '123456789');
```

## Response Format

### Success (200)
```json
{
  "inventory_quantity": 42
}
```

### Error Responses

#### 400 - Bad Request
```json
{
  "error": "Missing required parameter: variantGid or variantId"
}
```

#### 401 - Unauthorized
```json
{
  "error": "Invalid Shopify Admin API token"
}
```

#### 404 - Not Found
```json
{
  "error": "Variant not found"
}
```

#### 500 - Server Error
```json
{
  "error": "Internal server error",
  "message": "Detailed error message"
}
```

## Deployment Notes

This API endpoint is designed to work with serverless platforms like:
- Vercel (automatically detected in `/api` folder)
- Netlify Functions
- AWS Lambda
- Other serverless platforms

Make sure to set the required environment variables in your deployment platform.





