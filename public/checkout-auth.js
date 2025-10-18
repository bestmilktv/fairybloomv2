/**
 * Checkout Authentication Script for Shopify Checkout
 * This script runs on the checkout page to auto-fill customer data
 */

(function() {
  'use strict';
  
  // Configuration
  const AUTH_KEY = 'fairybloom_authenticated';
  const CUSTOMER_KEY = 'fairybloom_customer';
  const TIMESTAMP_KEY = 'fairybloom_auth_timestamp';
  const AUTH_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
  
  /**
   * Check if authentication is valid and not expired
   */
  function isAuthValid() {
    const isAuth = localStorage.getItem(AUTH_KEY) === 'true';
    const timestamp = localStorage.getItem(TIMESTAMP_KEY);
    
    if (!isAuth || !timestamp) {
      return false;
    }
    
    const authTime = parseInt(timestamp, 10);
    const now = Date.now();
    
    // Check if auth is not expired
    return (now - authTime) < AUTH_EXPIRY;
  }
  
  /**
   * Get customer data from localStorage
   */
  function getCustomerData() {
    if (!isAuthValid()) {
      return null;
    }
    
    try {
      const customerJson = localStorage.getItem(CUSTOMER_KEY);
      return customerJson ? JSON.parse(customerJson) : null;
    } catch (error) {
      console.error('Error parsing customer data:', error);
      return null;
    }
  }
  
  /**
   * Fill checkout form with customer data
   */
  function fillCheckoutForm(customer) {
    console.log('Filling checkout form with customer data:', customer);
    
    // Common field selectors for Shopify checkout
    const fieldSelectors = [
      // Email field
      'input[name="checkout[email]"]',
      'input[name="email"]',
      'input[type="email"]',
      '#checkout_email',
      '.field__input[type="email"]',
      
      // First name field
      'input[name="checkout[shipping_address][first_name]"]',
      'input[name="checkout[billing_address][first_name]"]',
      'input[name="first_name"]',
      'input[name="firstName"]',
      '#checkout_shipping_address_first_name',
      '#checkout_billing_address_first_name',
      '.field__input[name*="first_name"]',
      
      // Last name field
      'input[name="checkout[shipping_address][last_name]"]',
      'input[name="checkout[billing_address][last_name]"]',
      'input[name="last_name"]',
      'input[name="lastName"]',
      '#checkout_shipping_address_last_name',
      '#checkout_billing_address_last_name',
      '.field__input[name*="last_name"]'
    ];
    
    // Fill email
    const emailSelectors = fieldSelectors.slice(0, 5);
    for (const selector of emailSelectors) {
      const field = document.querySelector(selector);
      if (field && customer.email) {
        field.value = customer.email;
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('Filled email field:', selector);
        break;
      }
    }
    
    // Fill first name
    const firstNameSelectors = fieldSelectors.slice(5, 10);
    for (const selector of firstNameSelectors) {
      const field = document.querySelector(selector);
      if (field && customer.firstName) {
        field.value = customer.firstName;
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('Filled first name field:', selector);
        break;
      }
    }
    
    // Fill last name
    const lastNameSelectors = fieldSelectors.slice(10, 15);
    for (const selector of lastNameSelectors) {
      const field = document.querySelector(selector);
      if (field && customer.lastName) {
        field.value = customer.lastName;
        field.dispatchEvent(new Event('input', { bubbles: true }));
        field.dispatchEvent(new Event('change', { bubbles: true }));
        console.log('Filled last name field:', selector);
        break;
      }
    }
  }
  
  /**
   * Main function to check auth and fill form
   */
  function initCheckoutAuth() {
    console.log('Initializing checkout authentication...');
    
    const customer = getCustomerData();
    
    if (customer) {
      console.log('Customer is authenticated, filling form...');
      fillCheckoutForm(customer);
      
      // Also try to fill form after a delay (in case form loads later)
      setTimeout(() => {
        fillCheckoutForm(customer);
      }, 1000);
      
      // Try again after 3 seconds (for dynamic forms)
      setTimeout(() => {
        fillCheckoutForm(customer);
      }, 3000);
    } else {
      console.log('Customer is not authenticated or auth expired');
    }
  }
  
  /**
   * Clean up expired auth data
   */
  function cleanupExpiredAuth() {
    if (!isAuthValid()) {
      localStorage.removeItem(AUTH_KEY);
      localStorage.removeItem(CUSTOMER_KEY);
      localStorage.removeItem(TIMESTAMP_KEY);
      console.log('Cleaned up expired authentication data');
    }
  }
  
  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initCheckoutAuth);
  } else {
    initCheckoutAuth();
  }
  
  // Clean up expired auth
  cleanupExpiredAuth();
  
  // Also run on window load (fallback)
  window.addEventListener('load', initCheckoutAuth);
  
})();
