/**
 * Shopify Storefront API client
 * Handles GraphQL requests to Shopify's Storefront API
 */

// Types for Shopify API responses
export interface ShopifyProduct {
  id: string;
  title: string;
  description: string;
  handle: string;
  availableForSale: boolean;
  tags: string[];
  images: {
    edges: Array<{
      node: {
        url: string;
        altText?: string;
      };
    }>;
  };
  variants: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        availableForSale: boolean;
        price: {
          amount: string;
          currencyCode: string;
        };
      };
    }>;
  };
  collections?: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        handle: string;
      };
    }>;
  };
}

export interface ShopifyCollection {
  title: string;
  description?: string;
  products: {
    edges: Array<{
      node: ShopifyProduct;
    }>;
  };
}

export interface ShopifyResponse<T> {
  data: T;
  errors?: Array<{
    message: string;
    locations?: Array<{
      line: number;
      column: number;
    }>;
  }>;
}

/**
 * Initialize Shopify client with environment variables
 */
const domain = import.meta.env.VITE_SHOPIFY_STORE_DOMAIN;
const token = import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN;

/**
 * Helper function to send GraphQL requests to Shopify Storefront API
 * @param query - The GraphQL query string
 * @param variables - Variables for the GraphQL query (optional)
 * @returns Promise with the parsed JSON response
 * @throws Error if the request fails or GraphQL errors occur
 */
export async function fetchShopify<T>(
  query: string,
  variables: Record<string, any> = {}
): Promise<ShopifyResponse<T>> {
  if (!domain || !token) {
    throw new Error('Missing required environment variables: VITE_SHOPIFY_STORE_DOMAIN and VITE_SHOPIFY_STOREFRONT_TOKEN');
  }

  const url = `https://${domain}/api/2025-07/graphql.json`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': token,
      },
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    // Check for GraphQL errors
    if (data.errors && data.errors.length > 0) {
      const errorMessages = data.errors.map((error: any) => error.message).join(', ');
      throw new Error(`GraphQL errors: ${errorMessages}`);
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Shopify API request failed: ${error.message}`);
    }
    throw new Error('Unknown error occurred while fetching from Shopify');
  }
}

/**
 * Get products from a specific collection by handle
 * @param handle - The collection handle (e.g., "nahrdelniky", "nausnice")
 * @param first - Number of products to fetch (default: 20)
 * @returns Promise with collection data including products
 */

export async function getProductsByCollection(handle: string, first: number = 20) {
  const query = `
    query GetProducts($handle: String!, $first: Int!) {
      collectionByHandle(handle: $handle) {
        title
        description
        products(first: $first) {
          edges {
            node {
              id
              title
              description
              handle
              tags
              images(first: 5) {
                edges {
                  node {
                    url
                    altText
                  }
                }
              }
              variants(first: 5) {
                edges {
                  node {
                    id
                    availableForSale
                    price {
                      amount
                      currencyCode
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetchShopify<{ collectionByHandle: ShopifyCollection | null }>(query, {
      handle,
      first,
    });

    return response.data.collectionByHandle;
  } catch (error) {
    console.error(`Error fetching products for collection "${handle}":`, error);
    return null;
  }
}

/**
 * Get a single product by handle
 * @param handle - The product handle
 * @returns Promise with product data
 */
export async function getProductByHandle(handle: string) {
  const query = `
    query getProductByHandle($handle: String!) {
      product(handle: $handle) {
        id
        title
        handle
        description
        availableForSale
        tags
        images(first: 6) {
          edges {
            node {
              url
              altText
            }
          }
        }
        variants(first: 5) {
          edges {
            node {
              id
              title
              availableForSale
              price {
                amount
                currencyCode
              }
            }
          }
        }
        collections(first: 5) {
          edges {
            node {
              id
              title
              handle
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetchShopify<{ product: ShopifyProduct | null }>(query, {
      handle,
    });

    return response.data.product;
  } catch (error) {
    console.error(`Error fetching product "${handle}":`, error);
    return null;
  }
}

/**
 * GraphQL mutation to create a new cart
 * @param variantId - The variant ID to add to cart
 * @param quantity - Quantity to add (default: 1)
 * @returns Promise with cart data
 */
export async function createCart(variantId: string, quantity: number = 1) {
  console.log('Creating cart with variant ID:', variantId, 'quantity:', quantity) // DEBUG
  const mutation = `
    mutation cartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart {
          id
          totalQuantity
          cost {
            totalAmount {
              amount
              currencyCode
            }
          }
          lines(first: 10) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    product {
                      title
                      handle
                    }
                  }
                }
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    input: {
      lines: [
        {
          merchandiseId: variantId,
          quantity: quantity
        }
      ]
    }
  };

  try {
    const response = await fetchShopify<{ 
      cartCreate: { 
        cart: any; 
        userErrors: Array<{ field: string; message: string }> 
      } 
    }>(mutation, variables);

    console.log('Create cart response:', response) // DEBUG
    return response;
  } catch (error) {
    console.error('Error creating cart:', error);
    throw error;
  }
}

/**
 * GraphQL mutation to add items to an existing cart
 * @param cartId - The cart ID
 * @param variantId - The variant ID to add
 * @param quantity - Quantity to add (default: 1)
 * @returns Promise with updated cart data
 */
export async function addToCart(cartId: string, variantId: string, quantity: number = 1) {
  console.log('Adding to cart:', cartId, 'variant:', variantId, 'quantity:', quantity) // DEBUG
  const mutation = `
    mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart {
          id
          totalQuantity
          cost {
            totalAmount {
              amount
              currencyCode
            }
          }
          lines(first: 10) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    product {
                      title
                      handle
                    }
                  }
                }
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    cartId: cartId,
    lines: [
      {
        merchandiseId: variantId,
        quantity: quantity
      }
    ]
  };

  try {
    const response = await fetchShopify<{ 
      cartLinesAdd: { 
        cart: any; 
        userErrors: Array<{ field: string; message: string }> 
      } 
    }>(mutation, variables);

    console.log('Add to cart response:', response) // DEBUG
    return response;
  } catch (error) {
    console.error('Error adding to cart:', error);
    throw error;
  }
}

// Note: Customer authentication functions have been removed.
// Authentication is now handled via Shopify Customer Account API with OAuth 2.0 + PKCE.
// See src/lib/customerAccountApi.ts and src/lib/oauth.ts for the new implementation.

/**
 * Extract the correct collection tag from product tags, ignoring "Home page" tag
 * @param tags - Array of product tags
 * @returns The collection tag (e.g., "Náušnice") or null if no valid tag found
 */
export function getCollectionTagFromProductTags(tags: string[]): string | null {
  if (!tags || tags.length === 0) {
    return null;
  }
  
  // Filter out "Home page" tag completely and get the first remaining tag
  const filteredTags = tags.filter(tag => tag.toLowerCase() !== "home page");
  const collectionTag = filteredTags.length > 0 ? filteredTags[0] : null;
  
  return collectionTag;
}

/**
 * Get cart by ID from Shopify
 * @param cartId - The cart ID
 * @returns Promise with cart data
 */
export async function getCart(cartId: string) {
  const query = `
    query getCart($id: ID!) {
      cart(id: $id) {
        id
        totalQuantity
        cost {
          totalAmount {
            amount
            currencyCode
          }
        }
        lines(first: 100) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  price {
                    amount
                    currencyCode
                  }
                  product {
                    id
                    title
                    handle
                    images(first: 1) {
                      edges {
                        node {
                          url
                          altText
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetchShopify<{ cart: any }>(query, { id: cartId });
    
    // Check if cart exists
    if (!response.data.cart) {
      throw new Error(`Cart with ID ${cartId} not found or expired`);
    }
    
    return response.data.cart;
  } catch (error) {
    console.error('Error fetching cart:', error);
    throw error;
  }
}

/**
 * GraphQL mutation to update cart line quantities
 * @param cartId - The cart ID
 * @param lines - Array of line updates with id and quantity
 * @returns Promise with updated cart data
 */
export async function updateCartLines(cartId: string, lines: Array<{ id: string; quantity: number }>) {
  const mutation = `
    mutation cartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
      cartLinesUpdate(cartId: $cartId, lines: $lines) {
        cart {
          id
          totalQuantity
          cost {
            totalAmount {
              amount
              currencyCode
            }
          }
          lines(first: 100) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    product {
                      id
                      title
                      handle
                      images(first: 1) {
                        edges {
                          node {
                            url
                            altText
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    cartId: cartId,
    lines: lines
  };

  try {
    const response = await fetchShopify<{ 
      cartLinesUpdate: { 
        cart: any; 
        userErrors: Array<{ field: string; message: string }> 
      } 
    }>(mutation, variables);

    return response;
  } catch (error) {
    console.error('Error updating cart lines:', error);
    throw error;
  }
}

/**
 * Get checkout URL for cart
 * @param cartId - The cart ID
 * @returns Promise with checkout URL
 */
export async function getCheckoutUrl(cartId: string) {
  // Query Shopify for the cart's checkoutUrl
  const query = `
    query getCart($id: ID!) {
      cart(id: $id) {
        checkoutUrl
      }
    }
  `;

  try {
    const response = await fetchShopify<{ cart: { checkoutUrl: string } | null }>(query, { id: cartId });
    
    if (!response.data.cart || !response.data.cart.checkoutUrl) {
      throw new Error('Cart checkout URL not available');
    }
    
    // Replace primary domain with checkout subdomain
    let checkoutUrl = response.data.cart.checkoutUrl;
    checkoutUrl = checkoutUrl.replace('fairybloom.cz', 'pokladna.fairybloom.cz');
    checkoutUrl = checkoutUrl.replace('www.fairybloom.cz', 'pokladna.fairybloom.cz');
    
    console.log('Generated checkout URL:', checkoutUrl) // DEBUG
    
    return checkoutUrl;
  } catch (error) {
    console.error('Error fetching checkout URL:', error);
    throw error;
  }
}

/**
 * Associate customer access token with cart for automatic checkout login
 * @param cartId - The cart ID
 * @param customerAccessToken - The customer access token (shcat_...)
 * @returns Promise with updated cart data
 */
export async function associateCustomerWithCart(cartId: string, customerAccessToken: string) {
  const mutation = `
    mutation cartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
      cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
        cart {
          id
          buyerIdentity {
            email
            customer {
              id
              email
              firstName
              lastName
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    cartId: cartId,
    buyerIdentity: {
      customerAccessToken: customerAccessToken
    }
  };

  try {
    const response = await fetchShopify<{ 
      cartBuyerIdentityUpdate: { 
        cart: any; 
        userErrors: Array<{ field: string; message: string }> 
      } 
    }>(mutation, variables);

    if (response.data.cartBuyerIdentityUpdate.userErrors.length > 0) {
      console.error('Cart buyer identity update errors:', response.data.cartBuyerIdentityUpdate.userErrors);
      throw new Error('Failed to associate customer with cart');
    }

    console.log('Customer associated with cart:', response.data.cartBuyerIdentityUpdate.cart);
    return response.data.cartBuyerIdentityUpdate.cart;
  } catch (error) {
    console.error('Error associating customer with cart:', error);
    throw error;
  }
}

/**
 * Verify authentication status before checkout
 * This ensures the customer is logged in and cookies are properly set
 * @returns Promise<boolean> True if customer is authenticated
 */
export async function verifyCheckoutAuthentication(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/customer', {
      method: 'GET',
      credentials: 'include',
    });
    
    return response.ok;
  } catch (error) {
    console.error('Error verifying checkout authentication:', error);
    return false;
  }
}

/**
 * GraphQL mutation to remove lines from cart
 * @param cartId - The cart ID
 * @param lineIds - Array of line IDs to remove
 * @returns Promise with updated cart data
 */
export async function removeCartLines(cartId: string, lineIds: string[]) {
  const mutation = `
    mutation cartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
      cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
        cart {
          id
          totalQuantity
          cost {
            totalAmount {
              amount
              currencyCode
            }
          }
          lines(first: 100) {
            edges {
              node {
                id
                quantity
                merchandise {
                  ... on ProductVariant {
                    id
                    title
                    price {
                      amount
                      currencyCode
                    }
                    product {
                      id
                      title
                      handle
                      images(first: 1) {
                        edges {
                          node {
                            url
                            altText
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    cartId: cartId,
    lineIds: lineIds
  };

  try {
    const response = await fetchShopify<{ 
      cartLinesRemove: { 
        cart: any; 
        userErrors: Array<{ field: string; message: string }> 
      } 
    }>(mutation, variables);

    return response;
  } catch (error) {
    console.error('Error removing cart lines:', error);
    throw error;
  }
}

/**
 * Get inventory quantity for a product variant
 * @param variantGid - The variant GID (e.g., "gid://shopify/ProductVariant/123456789")
 * @param variantId - Alternative: plain numeric variant ID
 * @returns Promise with inventory quantity
 */
export async function getVariantInventory(variantGid?: string, variantId?: string) {
  if (!variantGid && !variantId) {
    throw new Error('Either variantGid or variantId must be provided');
  }

  try {
    const params = new URLSearchParams();
    if (variantGid) {
      params.append('variantGid', variantGid);
    } else if (variantId) {
      params.append('variantId', variantId);
    }

    const response = await fetch(`/api/shopify/inventory?${params.toString()}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.inventory_quantity;
  } catch (error) {
    console.error('Error fetching variant inventory:', error);
    throw error;
  }
}