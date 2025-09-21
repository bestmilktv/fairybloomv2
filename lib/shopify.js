/**
 * Shopify Storefront API client
 * Handles GraphQL requests to Shopify's Storefront API
 */

/**
 * Sends a GraphQL query to Shopify's Storefront API
 * @param {string} query - The GraphQL query string
 * @param {Object} variables - Variables for the GraphQL query (optional)
 * @returns {Promise<Object>} The parsed JSON response
 * @throws {Error} If the request fails or GraphQL errors occur
 */
export async function storefront(query, variables = {}) {
  const storeDomain = import.meta.env.VITE_SHOPIFY_STORE_DOMAIN;
  const accessToken = import.meta.env.VITE_SHOPIFY_STOREFRONT_TOKEN;

  if (!storeDomain || !accessToken) {
    throw new Error('Missing required environment variables: VITE_SHOPIFY_STORE_DOMAIN and VITE_SHOPIFY_STOREFRONT_TOKEN');
  }

  const url = `https://${storeDomain}/api/2025-07/graphql.json`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shopify-Storefront-Access-Token': accessToken,
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
      const errorMessages = data.errors.map(error => error.message).join(', ');
      throw new Error(`GraphQL errors: ${errorMessages}`);
    }

    return data;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Network error: ${error.message}`);
  }
}

/**
 * Helper function to get products from Shopify
 * @param {number} first - Number of products to fetch (default: 10)
 * @returns {Promise<Object>} Products data from Shopify
 */
export async function getProducts(first = 10) {
  const query = `
    query getProducts($first: Int!) {
      products(first: $first) {
        edges {
          node {
            id
            title
            description
            handle
            images(first: 1) {
              edges {
                node {
                  url
                  altText
                }
              }
            }
            variants(first: 1) {
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
  `;

  return storefront(query, { first });
}

/**
 * Helper function to get a single product by handle
 * @param {string} handle - The product handle
 * @returns {Promise<Object>} Product data from Shopify
 */
export async function getProduct(handle) {
  const query = `
    query getProduct($handle: String!) {
      product(handle: $handle) {
        id
        title
        description
        handle
        images(first: 10) {
          edges {
            node {
              url
              altText
            }
          }
        }
        variants(first: 10) {
          edges {
            node {
              id
              title
              price {
                amount
                currencyCode
              }
              availableForSale
            }
          }
        }
      }
    }
  `;

  return storefront(query, { handle });
}

/**
 * Helper function to get collections from Shopify
 * @param {number} first - Number of collections to fetch (default: 10)
 * @returns {Promise<Object>} Collections data from Shopify
 */
export async function getCollections(first = 10) {
  const query = `
    query getCollections($first: Int!) {
      collections(first: $first) {
        edges {
          node {
            id
            title
            description
            handle
            image {
              url
              altText
            }
          }
        }
      }
    }
  `;

  return storefront(query, { first });
}

/**
 * Helper function to get products from a specific collection
 * @param {string} collectionHandle - The collection handle (e.g., 'necklaces', 'earrings')
 * @param {number} first - Number of products to fetch (default: 3)
 * @returns {Promise<Object>} Products data from the collection
 */
export async function getCollectionProducts(collectionHandle, first = 3) {
  const query = `
    query getCollectionProducts($handle: String!, $first: Int!) {
      collection(handle: $handle) {
        id
        title
        description
        products(first: $first) {
          edges {
            node {
              id
              title
              handle
              description
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

  return storefront(query, { handle: collectionHandle, first });
}

/**
 * Helper function to get multiple collections with their products
 * @param {Array<string>} collectionHandles - Array of collection handles
 * @param {number} productsPerCollection - Number of products per collection (default: 3)
 * @returns {Promise<Array>} Array of collections with their products
 */
export async function getCollectionsWithProducts(collectionHandles, productsPerCollection = 3) {
  try {
    const promises = collectionHandles.map(async (handle) => {
      const result = await getCollectionProducts(handle, productsPerCollection);
      return result.data.collection;
    });

    const collections = await Promise.all(promises);
    return collections.filter(collection => collection !== null);
  } catch (error) {
    console.error('Error fetching collections with products:', error);
    throw error;
  }
}

/**
 * Helper function to get a product by handle with detailed information
 * @param {string} handle - The product handle
 * @returns {Promise<Object>} Product data from Shopify
 */
export async function getProductByHandle(handle) {
  const query = `
    query getProductByHandle($handle: String!) {
      product(handle: $handle) {
        id
        title
        handle
        description
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
              availableForSale
            }
          }
        }
      }
    }
  `;

  return storefront(query, { handle });
}

/**
 * Create a new cart with a product variant
 * @param {string} variantId - The variant ID to add to cart
 * @param {number} quantity - The quantity to add (default: 1)
 * @returns {Promise<Object>} Cart data with checkout URL
 */
export async function createCart(variantId, quantity = 1) {
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

  return storefront(mutation, variables);
}

/**
 * Add a product variant to an existing cart
 * @param {string} cartId - The cart ID
 * @param {string} variantId - The variant ID to add
 * @param {number} quantity - The quantity to add (default: 1)
 * @returns {Promise<Object>} Updated cart data
 */
export async function addToCart(cartId, variantId, quantity = 1) {
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

  return storefront(mutation, variables);
}
