/**
 * Shopify Customer Account API client
 * Handles GraphQL requests to Shopify's Customer Account API
 */

// Types for Customer Account API responses
export interface CustomerAccountCustomer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface CustomerAccountAddress {
  id: string;
  address1: string;
  address2?: string;
  city: string;
  province?: string;
  zip: string;
  country: string;
  phone?: string;
}

export interface CustomerAccountOrder {
  id: string;
  orderNumber: string;
  processedAt: string;
  totalPrice: {
    amount: string;
    currencyCode: string;
  };
  fulfillmentStatus: string;
  lineItems: {
    edges: Array<{
      node: {
        id: string;
        title: string;
        quantity: number;
        variant: {
          id: string;
          title: string;
          image?: {
            url: string;
            altText?: string;
          };
        };
      };
    }>;
  };
}

export interface CustomerAccountApiResponse<T> {
  data: T;
  errors?: Array<{
    message: string;
    locations?: Array<{
      line: number;
      column: number;
    }>;
  }>;
}

// Configuration
const SHOP_ID = import.meta.env.VITE_SHOPIFY_SHOP_ID;
const CUSTOMER_ACCOUNT_URL = `https://shopify.com/${SHOP_ID}/account/customer/api/unstable/graphql`;

/**
 * Make authenticated request to Customer Account API
 * @param {string} query - GraphQL query
 * @param {object} variables - Query variables
 * @returns {Promise<CustomerAccountApiResponse<T>>} API response
 */
async function fetchCustomerAccount<T>(
  query: string,
  variables: Record<string, any> = {}
): Promise<CustomerAccountApiResponse<T>> {
  if (!SHOP_ID) {
    throw new Error('Missing SHOPIFY_SHOP_ID environment variable');
  }

  try {
    const response = await fetch(CUSTOMER_ACCOUNT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Include cookies for authentication
      body: JSON.stringify({
        query,
        variables,
      }),
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Authentication required');
      }
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
      throw new Error(`Customer Account API request failed: ${error.message}`);
    }
    throw new Error('Unknown error occurred while fetching from Customer Account API');
  }
}

/**
 * Fetch customer profile data via backend API
 * @returns {Promise<CustomerAccountCustomer | null>} Customer data or null if not authenticated
 */
export async function fetchCustomerProfile(): Promise<CustomerAccountCustomer | null> {
  try {
    const response = await fetch('/api/auth/customer', {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      if (response.status === 401) {
        return null;
      }
      throw new Error(`Failed to fetch customer profile: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching customer profile:', error);
    return null;
  }
}

/**
 * Fetch customer orders
 * @param {number} first - Number of orders to fetch (default: 10)
 * @returns {Promise<CustomerAccountOrder[]>} Array of orders
 */
export async function fetchCustomerOrders(first: number = 10): Promise<CustomerAccountOrder[]> {
  const query = `
    query getCustomerOrders($first: Int!) {
      customer {
        orders(first: $first) {
          edges {
            node {
              id
              orderNumber
              processedAt
              totalPrice {
                amount
                currencyCode
              }
              fulfillmentStatus
              lineItems(first: 10) {
                edges {
                  node {
                    id
                    title
                    quantity
                    variant {
                      id
                      title
                      image {
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
  `;

  try {
    const response = await fetchCustomerAccount<{ 
      customer: { 
        orders: { 
          edges: Array<{ node: CustomerAccountOrder }> 
        } 
      } | null 
    }>(query, { first });

    if (!response.data.customer) {
      return [];
    }

    return response.data.customer.orders.edges.map(edge => edge.node);
  } catch (error) {
    console.error('Error fetching customer orders:', error);
    return [];
  }
}

/**
 * Fetch a specific customer order by ID
 * @param {string} orderId - The order ID
 * @returns {Promise<CustomerAccountOrder | null>} Order data or null if not found
 */
export async function fetchCustomerOrder(orderId: string): Promise<CustomerAccountOrder | null> {
  const query = `
    query getCustomerOrder($id: ID!) {
      customer {
        order(id: $id) {
          id
          orderNumber
          processedAt
          totalPrice {
            amount
            currencyCode
          }
          fulfillmentStatus
          lineItems(first: 50) {
            edges {
              node {
                id
                title
                quantity
                variant {
                  id
                  title
                  image {
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
  `;

  try {
    const response = await fetchCustomerAccount<{ 
      customer: { 
        order: CustomerAccountOrder | null 
      } | null 
    }>(query, { id: orderId });

    if (!response.data.customer) {
      return null;
    }

    return response.data.customer.order;
  } catch (error) {
    console.error('Error fetching customer order:', error);
    return null;
  }
}

/**
 * Check if customer is authenticated by checking backend
 * @returns {Promise<boolean>} True if authenticated
 */
export async function isCustomerAuthenticated(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/customer', {
      method: 'GET',
      credentials: 'include',
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

/**
 * Update customer profile information
 * @param {object} updates - Object with firstName and/or lastName
 * @returns {Promise<CustomerAccountCustomer | null>} Updated customer data or null if failed
 */
export async function updateCustomerProfile(updates: { firstName?: string; lastName?: string }): Promise<CustomerAccountCustomer | null> {
  try {
    const response = await fetch('/api/auth/customer/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(updates),
    });

    if (!response.ok) {
      if (response.status === 401) {
        return null;
      }
      throw new Error(`Failed to update customer profile: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error updating customer profile:', error);
    return null;
  }
}

/**
 * Logout customer by calling logout endpoint
 * @returns {Promise<boolean>} True if logout successful
 */
export async function logoutCustomer(): Promise<boolean> {
  try {
    const response = await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });

    if (!response.ok) {
      throw new Error(`Logout failed: ${response.status}`);
    }

    return true;
  } catch (error) {
    console.error('Error logging out customer:', error);
    return false;
  }
}
