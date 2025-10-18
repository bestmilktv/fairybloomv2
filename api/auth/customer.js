/**
 * Customer Data Endpoint
 * Fetches customer profile data using the access token from HTTP-only cookie
 */

import { getAuthCookie } from '../utils/cookies.js';

export default async function handler(req, res) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get access token from HTTP-only cookie
    const accessToken = getAuthCookie(req);
    
    if (!accessToken) {
      return res.status(401).json({ error: 'No authentication token found' });
    }

    // Get customer account domain from environment
    const customerAccountDomain = 'ucet.fairybloom.cz';
    
    // Query Shopify Customer Account API
    const customerAccountUrl = `https://${customerAccountDomain}/api/unstable/graphql`;
    
    const query = `
      query getCustomer {
        customer {
          id
          emailAddress
          firstName
          lastName
          defaultAddress {
            id
            address1
            address2
            city
            province
            zip
            country
            phone
          }
          addresses(first: 10) {
            edges {
              node {
                id
                address1
                address2
                city
                province
                zip
                country
                phone
              }
            }
          }
        }
      }
    `;

    const response = await fetch(customerAccountUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ query })
    });

    if (!response.ok) {
      if (response.status === 401) {
        return res.status(401).json({ error: 'Invalid or expired token' });
      }
      const errorText = await response.text();
      console.error('Customer Account API error:', response.status, errorText);
      return res.status(500).json({ error: 'Failed to fetch customer data' });
    }

    const result = await response.json();
    
    if (result.errors && result.errors.length > 0) {
      console.error('GraphQL errors:', result.errors);
      return res.status(500).json({ error: 'GraphQL query failed' });
    }

    const customer = result.data?.customer;
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    // Transform the data to match our frontend expectations
    const customerData = {
      id: customer.id,
      email: customer.emailAddress,
      firstName: customer.firstName,
      lastName: customer.lastName,
      defaultAddress: customer.defaultAddress ? {
        id: customer.defaultAddress.id,
        address1: customer.defaultAddress.address1,
        address2: customer.defaultAddress.address2,
        city: customer.defaultAddress.city,
        zip: customer.defaultAddress.zip,
        country: customer.defaultAddress.country,
        phone: customer.defaultAddress.phone
      } : null,
      addresses: customer.addresses?.edges?.map(edge => ({
        id: edge.node.id,
        address1: edge.node.address1,
        address2: edge.node.address2,
        city: edge.node.city,
        zip: edge.node.zip,
        country: edge.node.country,
        phone: edge.node.phone
      })) || []
    };

    return res.status(200).json(customerData);

  } catch (error) {
    console.error('Customer API error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
