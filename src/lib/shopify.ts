/**
 * Shopify Storefront API client
 * Handles GraphQL requests to Shopify's Storefront API
 */

import { slugify, slugifyCollection, deslugifyCollection } from './slugify';

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
  id: string;
  title: string;
  handle: string;
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

  const url = `https://${domain}/api/2025-01/graphql.json`;

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
        id
        title
        handle
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

/**
 * Create a new customer account using Shopify Storefront API
 * CHANGED: Now uses two-step process - create customer first, then add address
 * @param customerData - Customer registration data
 * @param customerData.firstName - Customer's first name
 * @param customerData.lastName - Customer's last name
 * @param customerData.email - Customer's email address
 * @param customerData.password - Customer's password
 * @param customerData.passwordConfirmation - Customer's password confirmation (frontend validation only)
 * @param customerData.acceptsMarketing - Whether customer accepts marketing emails
 * @param customerData.address - Customer's address object with address1, city, zip, country
 * @returns Promise with success status and customer ID or error details
 */
export async function createCustomer({
  firstName,
  lastName,
  email,
  password,
  passwordConfirmation, // CHANGED: Keep for frontend validation but don't send to API
  acceptsMarketing,
  address
}: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  passwordConfirmation: string;
  acceptsMarketing: boolean;
  address: {
    address1: string;
    city: string;
    zip: string;
    country: string;
  };
}) {
  // CHANGED: Step 1 - Create customer with only allowed fields (no passwordConfirmation or addresses)
  const customerCreateMutation = `
    mutation customerCreate($input: CustomerCreateInput!) {
      customerCreate(input: $input) {
        customer {
          id
        }
        userErrors {
          field
          message
        }
      }
    }
  `;

  // CHANGED: Only send allowed fields to CustomerCreateInput
  const customerCreateVariables = {
    input: {
      firstName,
      lastName,
      email,
      password,
      acceptsMarketing
      // CHANGED: Removed passwordConfirmation and addresses from customer creation
    }
  };

  try {
    // Step 1: Create the customer
    const customerResponse = await fetchShopify<{
      customerCreate: {
        customer: { id: string } | null;
        userErrors: Array<{ field: string; message: string }>;
      };
    }>(customerCreateMutation, customerCreateVariables);

    const { customer, userErrors } = customerResponse.data.customerCreate;

    if (userErrors && userErrors.length > 0) {
      console.error("Shopify customerCreate userErrors:", userErrors);
      return {
        success: false,
        errors: userErrors
      };
    }

    if (!customer) {
      return {
        success: false,
        errors: [{ field: 'general', message: 'Customer creation failed' }]
      };
    }

    // CHANGED: Step 2 - Create customer address using customerAccessToken
    const addressCreateMutation = `
      mutation customerAddressCreate($customerAccessToken: String!, $address: MailingAddressInput!) {
        customerAddressCreate(customerAccessToken: $customerAccessToken, address: $address) {
          customerAddress {
            id
          }
          customerUserErrors {
            field
            message
          }
        }
      }
    `;

    // CHANGED: Get customer access token for address creation
    const loginResult = await loginCustomer(email, password);
    if (!loginResult.success) {
      console.error("Failed to get customer access token for address creation:", loginResult.errors);
      // Customer was created but we couldn't add address - still return success
      return {
        success: true,
        customerId: customer.id,
        warning: "Customer created but address could not be added"
      };
    }

    const addressCreateVariables = {
      customerAccessToken: loginResult.accessToken,
      address: {
        address1: address.address1,
        city: address.city,
        zip: address.zip,
        country: address.country
      }
    };

    // Step 2: Create the customer address
    const addressResponse = await fetchShopify<{
      customerAddressCreate: {
        customerAddress: { id: string } | null;
        customerUserErrors: Array<{ field: string; message: string }>;
      };
    }>(addressCreateMutation, addressCreateVariables);

    const { customerAddress, customerUserErrors } = addressResponse.data.customerAddressCreate;

    if (customerUserErrors && customerUserErrors.length > 0) {
      console.error("Shopify customerAddressCreate userErrors:", customerUserErrors);
      // Customer was created but address failed - still return success
      return {
        success: true,
        customerId: customer.id,
        warning: "Customer created but address could not be added"
      };
    }

    return {
      success: true,
      customerId: customer.id
    };
  } catch (error) {
    console.error('Error creating customer:', error);
    return {
      success: false,
      errors: [{ field: 'general', message: 'Failed to create customer account' }]
    };
  }
}

/**
 * Login a customer using email and password
 * @param email - Customer's email address
 * @param password - Customer's password
 * @returns Promise with success status, access token, and expiration or error details
 */
export async function loginCustomer(email: string, password: string) {
  const mutation = `
    mutation customerAccessTokenCreate($input: CustomerAccessTokenCreateInput!) {
      customerAccessTokenCreate(input: $input) {
        customerAccessToken {
          accessToken
          expiresAt
        }
        customerUserErrors {
          field
          message
        }
      }
    }
  `;

  const variables = {
    input: {
      email,
      password
    }
  };

  try {
    const response = await fetchShopify<{
      customerAccessTokenCreate: {
        customerAccessToken: {
          accessToken: string;
          expiresAt: string;
        } | null;
        customerUserErrors: Array<{ field: string; message: string }>;
      };
    }>(mutation, variables);

    const { customerAccessToken, customerUserErrors } = response.data.customerAccessTokenCreate;

    if (customerUserErrors && customerUserErrors.length > 0) {
      return {
        success: false,
        errors: customerUserErrors
      };
    }

    if (!customerAccessToken) {
      return {
        success: false,
        errors: [{ field: 'general', message: 'Login failed' }]
      };
    }

    return {
      success: true,
      accessToken: customerAccessToken.accessToken,
      expiresAt: customerAccessToken.expiresAt
    };
  } catch (error) {
    console.error('Error logging in customer:', error);
    return {
      success: false,
      errors: [{ field: 'general', message: 'Failed to login customer' }]
    };
  }
}

/**
 * Get customer information using customer access token
 * @param customerAccessToken - The customer access token
 * @returns Promise with customer data including name, email, and default address
 */
export async function getCustomer(customerAccessToken: string) {
  const query = `
    query getCustomer($customerAccessToken: String!) {
      customer(customerAccessToken: $customerAccessToken) {
        firstName
        lastName
        email
        defaultAddress {
          address1
          city
          zip
          country
        }
      }
    }
  `;

  try {
    const response = await fetchShopify<{
      customer: {
        firstName: string;
        lastName: string;
        email: string;
        defaultAddress: {
          address1: string;
          city: string;
          zip: string;
          country: string;
        } | null;
      } | null;
    }>(query, {
      customerAccessToken,
    });

    return response.data.customer;
  } catch (error) {
    console.error('Error fetching customer:', error);
    return null;
  }
}

/**
 * Collection mapping for Czech category names to slugified handles
 */
export const collectionMapping = {
  'náhrdelníky': 'nahrdelniky',
  'náušnice': 'nausnice', 
  'prsteny': 'prsteny',
  'náramky': 'naramky'
} as const;

/**
 * Reverse mapping from slugified handles to Czech names
 */
export const reverseCollectionMapping = {
  'nahrdelniky': 'náhrdelníky',
  'nausnice': 'náušnice',
  'prsteny': 'prsteny',
  'naramky': 'náramky'
} as const;

/**
 * Get the correct collection tag from product tags (ignoring "Home page")
 * @param product - The Shopify product
 * @returns The collection tag or null if not found
 */
export function getCollectionTag(product: ShopifyProduct): string | null {
  if (!product.tags || product.tags.length === 0) {
    return null;
  }
  
  // Find the first tag that is NOT "Home page" and looks like a collection name
  return product.tags.find(tag => 
    tag.toLowerCase() !== 'home page' && 
    (tag.includes('náhrdelník') || tag.includes('náušnice') || tag.includes('prsten') || tag.includes('náramek'))
  ) || null;
}

/**
 * Get the primary collection for a product using tags (ignoring "Home page" tag)
 * @param product - The Shopify product
 * @returns Object with collection handle and title
 */
export function getPrimaryCollection(product: ShopifyProduct): { handle: string; title: string } {
  // First priority: Use product tags, ignoring "Home page" tag
  const collectionTag = getCollectionTag(product);
  if (collectionTag) {
    const slugifiedHandle = slugifyCollection(collectionTag);
    const czechTitle = deslugifyCollection(slugifiedHandle);
    return {
      handle: slugifiedHandle,
      title: czechTitle
    };
  }

  // Second priority: Use collections if available (also ignore "Home page" collection)
  if (product.collections?.edges && product.collections.edges.length > 0) {
    // Find first collection that is not "Home page"
    const validCollection = product.collections.edges.find(edge => 
      edge.node.title.toLowerCase() !== 'home page'
    );
    
    if (validCollection) {
      const collection = validCollection.node;
      const slugifiedHandle = slugifyCollection(collection.title);
      const czechTitle = deslugifyCollection(slugifiedHandle);
      return {
        handle: slugifiedHandle,
        title: czechTitle
      };
    }
  }

  // Fallback: determine collection from product handle
  const productHandle = product.handle.toLowerCase();
  if (productHandle.includes('nahr') || productHandle.includes('necklace')) {
    return { handle: 'nahrdelniky', title: 'Náhrdelníky' };
  }
  if (productHandle.includes('naus') || productHandle.includes('earring')) {
    return { handle: 'nausnice', title: 'Náušnice' };
  }
  if (productHandle.includes('prst') || productHandle.includes('ring')) {
    return { handle: 'prsteny', title: 'Prsteny' };
  }
  if (productHandle.includes('nara') || productHandle.includes('bracelet')) {
    return { handle: 'naramky', title: 'Náramky' };
  }

  // Default fallback
  return { handle: 'nahrdelniky', title: 'Náhrdelníky' };
}

/**
 * Get the correct collection handle from a category name
 * @param categoryName - The category name (Czech or English)
 * @returns The collection handle or null if not found
 */
export function getCollectionHandle(categoryName: string): string | null {
  // Check if it's already a handle
  if (Object.values(collectionMapping).includes(categoryName as any)) {
    return categoryName;
  }
  
  // Check if it's a Czech name
  if (collectionMapping[categoryName as keyof typeof collectionMapping]) {
    return collectionMapping[categoryName as keyof typeof collectionMapping];
  }
  
  // Try to find by partial match
  const lowerCategory = categoryName.toLowerCase();
  for (const [czechName, handle] of Object.entries(collectionMapping)) {
    if (czechName.toLowerCase().includes(lowerCategory) || lowerCategory.includes(czechName.toLowerCase())) {
      return handle;
    }
  }
  
  return null;
}

/**
 * Get all collections from Shopify (for debugging)
 * @returns Promise with all collections
 */
export async function getAllCollections() {
  const query = `
    query GetAllCollections {
      collections(first: 50) {
        edges {
          node {
            id
            title
            handle
            description
          }
        }
      }
    }
  `;

  try {
    const response = await fetchShopify<{ collections: { edges: Array<{ node: { id: string; title: string; handle: string; description?: string } }> } }>(query);
    return response.data.collections.edges.map(edge => edge.node);
  } catch (error) {
    console.error('Error fetching all collections:', error);
    return [];
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