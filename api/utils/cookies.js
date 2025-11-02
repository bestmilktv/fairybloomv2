/**
 * Cookie utility functions for secure authentication
 * Handles HTTP-only cookies with proper security flags
 */

/**
 * Set authentication cookie with secure flags
 * @param {Object} res - Response object
 * @param {string} token - Access token to store
 * @param {string} expiresAt - ISO string of expiration time
 * @param {Object} customerData - Customer data from JWT (optional)
 */
export function setAuthCookie(res, token, expiresAt, customerData = null) {
  const cookieValue = JSON.stringify({
    access_token: token,
    expires_at: expiresAt,
    customer: customerData
  });
  
  const encodedValue = Buffer.from(cookieValue).toString('base64');
  
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'None', // Změna z 'Lax' na 'None' pro cross-subdomain sharing
    domain: process.env.NODE_ENV === 'production' ? '.fairybloom.cz' : 'localhost',
    path: '/',
    expires: new Date(expiresAt)
  };

  // Set the cookie
  res.setHeader('Set-Cookie', [
    `shopify_access_token=${encodedValue}; ${Object.entries(cookieOptions)
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

  const tokenMatch = cookies.match(/shopify_access_token=([^;]+)/);
  if (!tokenMatch) {
    console.log('[getAuthCookie] shopify_access_token cookie not found in header');
    return null;
  }
  
  try {
    const decoded = Buffer.from(tokenMatch[1], 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded);
    console.log('[getAuthCookie] Successfully decoded cookie, has access_token:', !!parsed.access_token);
    return parsed;
  } catch (error) {
    console.error('[getAuthCookie] Failed to decode auth cookie:', error.message);
    return null;
  }
}

/**
 * Clear authentication cookie
 * @param {Object} res - Response object
 */
export function clearAuthCookie(res) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'None', // Změna z 'Lax' na 'None' pro cross-subdomain sharing
    domain: process.env.NODE_ENV === 'production' ? '.fairybloom.cz' : 'localhost',
    path: '/',
    expires: new Date(0) // Expire immediately
  };

  res.setHeader('Set-Cookie', [
    `shopify_access_token=; ${Object.entries(cookieOptions)
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
