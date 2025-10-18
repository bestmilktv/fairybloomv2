/**
 * PKCE (Proof Key for Code Exchange) utility functions
 * Implements RFC 7636 for secure OAuth 2.0 authorization code flow
 */

/**
 * Generate a cryptographically random code verifier
 * @returns {string} A 128-character random string
 */
export function generateCodeVerifier(): string {
  const array = new Uint8Array(96); // 96 bytes = 128 base64url characters
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Generate code challenge from code verifier using SHA-256
 * @param {string} codeVerifier - The code verifier
 * @returns {Promise<string>} Base64URL-encoded SHA-256 hash
 */
export async function generateCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return base64UrlEncode(new Uint8Array(digest));
}

/**
 * Generate a random state parameter for CSRF protection
 * @returns {string} A 32-character random string
 */
export function generateState(): string {
  const array = new Uint8Array(24); // 24 bytes = 32 base64url characters
  crypto.getRandomValues(array);
  return base64UrlEncode(array);
}

/**
 * Base64URL encode a Uint8Array
 * @param {Uint8Array} array - The array to encode
 * @returns {string} Base64URL-encoded string
 */
function base64UrlEncode(array: Uint8Array): string {
  // Convert to base64
  const base64 = btoa(String.fromCharCode(...array));
  
  // Convert to base64url by replacing characters and removing padding
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

/**
 * Validate that a string is a valid base64url string
 * @param {string} str - String to validate
 * @returns {boolean} True if valid base64url
 */
export function isValidBase64Url(str: string): boolean {
  const base64UrlRegex = /^[A-Za-z0-9_-]+$/;
  return base64UrlRegex.test(str);
}

/**
 * Validate code verifier format according to RFC 7636
 * @param {string} codeVerifier - Code verifier to validate
 * @returns {boolean} True if valid
 */
export function isValidCodeVerifier(codeVerifier: string): boolean {
  // Must be 43-128 characters long and contain only unreserved characters
  return codeVerifier.length >= 43 && 
         codeVerifier.length <= 128 && 
         isValidBase64Url(codeVerifier);
}

/**
 * Validate state parameter format
 * @param {string} state - State parameter to validate
 * @returns {boolean} True if valid
 */
export function isValidState(state: string): boolean {
  // Should be reasonably long and contain only safe characters
  return state.length >= 16 && 
         state.length <= 64 && 
         isValidBase64Url(state);
}
