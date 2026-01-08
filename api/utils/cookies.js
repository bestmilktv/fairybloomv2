/**
 * Cookie utility functions for secure authentication
 * Handles HTTP-only cookies with proper security flags
 */

/**
 * Set authentication cookie with secure flags
 * @param {Object} res - Response object
 * @param {string} token - Access token to store
 * @param {string} expiresAt - ISO string of expiration time (from Shopify)
 * @param {Object} customerData - Customer data from JWT (optional)
 * @param {number} sessionMaxAge - Max age for session in seconds (default: 30 minutes)
 */
export function setAuthCookie(res, token, expiresAt, customerData = null, sessionMaxAge = 1800) {
  // Calculate session expiration (shorter than Shopify token expiration)
  // This ensures users are logged out after the session time, even if Shopify token is still valid
  const sessionExpiresAt = new Date(Date.now() + (sessionMaxAge * 1000)).toISOString();
  
  const cookieValue = JSON.stringify({
    access_token: token,
    expires_at: expiresAt, // Shopify token expiration (for reference)
    session_expires_at: sessionExpiresAt, // Our own session expiration
    customer: customerData
  });
  
  const encodedValue = Buffer.from(cookieValue).toString('base64');
  
  // Cookie options - don't set domain to allow browser to set it automatically
  // This ensures cookie works for both www.fairybloom.cz and fairybloom.cz
  const expiresDate = new Date(sessionExpiresAt); // Use session expiration for cookie
  const cookieString = [
    `shopify_access_token=${encodedValue}`,
    `Path=/`,
    `Expires=${expiresDate.toUTCString()}`,
    `Max-Age=${sessionMaxAge}`, // Add Max-Age for better browser support
    `HttpOnly`,
    process.env.NODE_ENV === 'production' ? `Secure` : '',
    `SameSite=None`
  ].filter(Boolean).join('; ');

  // Set the cookie - always use array to allow multiple cookies
  const existingCookies = res.getHeader('Set-Cookie');
  let cookieArray = [];
  
  if (existingCookies) {
    if (Array.isArray(existingCookies)) {
      cookieArray = existingCookies;
    } else {
      cookieArray = [existingCookies];
    }
  }
  
  cookieArray.push(cookieString);
  res.setHeader('Set-Cookie', cookieArray);
}

/**
 * Get authentication data from cookie
 * @param {Object} req - Request object
 * @returns {Object|null} - Auth data object { access_token, expires_at, customer } or null if not found
 */
export function getAuthCookie(req) {
  const cookies = req.headers.cookie;
  if (!cookies) {
    console.log('[getAuthCookie] No cookies header');
    return null;
  }

  // Try to find cookie - handle both direct match and URL-encoded values
  let tokenMatch = cookies.match(/shopify_access_token=([^;]+)/);
  if (!tokenMatch) {
    // Try URL-encoded version
    tokenMatch = cookies.match(/shopify_access_token=([^;,\s]+)/);
  }
  
  if (!tokenMatch) {
    console.log('[getAuthCookie] shopify_access_token cookie not found in header');
    console.log('[getAuthCookie] Available cookies:', cookies.substring(0, 200));
    return null;
  }
  
  try {
    const cookieValue = tokenMatch[1].trim();
    const decoded = Buffer.from(cookieValue, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);
    
    // Validate that parsed object has required fields
    if (!parsed || typeof parsed !== 'object') {
      console.error('[getAuthCookie] Parsed cookie is not an object');
      return null;
    }
    
    if (!parsed.access_token) {
      console.error('[getAuthCookie] Parsed cookie missing access_token');
      return null;
    }
    
    // Check if SESSION is expired (use our own session expiration, not Shopify token expiration)
    // This ensures users are logged out after the session time, even if Shopify token is still valid
    const expirationToCheck = parsed.session_expires_at || parsed.expires_at;
    if (expirationToCheck) {
      const expiresDate = new Date(expirationToCheck);
      const now = new Date();
      if (expiresDate < now) {
        console.log('[getAuthCookie] Session expired:', expirationToCheck);
        return null;
      }
    }
    
    console.log('[getAuthCookie] Successfully decoded cookie, has access_token:', !!parsed.access_token);
    return parsed;
  } catch (error) {
    console.error('[getAuthCookie] Failed to decode auth cookie:', error.message);
    console.error('[getAuthCookie] Cookie value preview:', tokenMatch[1]?.substring(0, 50));
    return null;
  }
}

/**
 * Clear authentication cookie
 * @param {Object} res - Response object
 */
export function clearAuthCookie(res) {
  // Clear cookie by setting it with past expiration date
  const cookieString = [
    `shopify_access_token=`,
    `Path=/`,
    `Expires=Thu, 01 Jan 1970 00:00:00 GMT`,
    `HttpOnly`,
    process.env.NODE_ENV === 'production' ? `Secure` : '',
    `SameSite=None`
  ].filter(Boolean).join('; ');

  res.setHeader('Set-Cookie', cookieString);
}

/**
 * Set temporary cookie for PKCE state/verifier storage
 * @param {Object} res - Response object
 * @param {string} key - Cookie key
 * @param {string} value - Cookie value
 * @param {number} maxAge - Max age in seconds (default: 10 minutes)
 */
export function setTempCookie(res, key, value, maxAge = 600) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'None', // Změna z 'Lax' na 'None' pro cross-subdomain sharing
    domain: process.env.NODE_ENV === 'production' ? '.fairybloom.cz' : 'localhost',
    path: '/',
    maxAge: maxAge
  };

  res.setHeader('Set-Cookie', [
    `${key}=${value}; ${Object.entries(cookieOptions)
      .map(([key, value]) => {
        if (typeof value === 'boolean') {
          return value ? key : '';
        }
        return `${key}=${value}`;
      })
      .filter(Boolean)
      .join('; ')}`
  ]);
}

/**
 * Get temporary cookie value
 * @param {Object} req - Request object
 * @param {string} key - Cookie key
 * @returns {string|null} - Cookie value or null if not found
 */
export function getTempCookie(req, key) {
  const cookies = req.headers.cookie;
  if (!cookies) return null;

  const match = cookies.match(new RegExp(`${key}=([^;]+)`));
  return match ? match[1] : null;
}
