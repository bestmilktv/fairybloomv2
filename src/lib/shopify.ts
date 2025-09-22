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
        price: {
          amount: string;
          currencyCode: string;
        };
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

  const url = `https://${domain}/api/2023-10/graphql.json`;

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
        totalInventory
        featuredImage {
          url
          altText
        }
        priceRange {
          minVariantPrice {
            amount
            currencyCode
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
  const mutation = `
    mutation cartCreate($input: CartInput!) {
      cartCreate(input: $input) {
        cart {
          id
          checkoutUrl
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
  const mutation = `
    mutation cartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
      cartLinesAdd(cartId: $cartId, lines: $lines) {
        cart {
          id
          checkoutUrl
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

    return response;
  } catch (error) {
    console.error('Error adding to cart:', error);
    throw error;
  }
}