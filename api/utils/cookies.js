/**
 * Cookie utility functions for secure authentication
 * Handles HTTP-only cookies with proper security flags
 */

/**
 * Set authentication cookie with secure flags
 * @param {Object} res - Response object
 * @param {string} token - Access token to store
 * @param {string} expiresAt - ISO string of expiration time
 */
export function setAuthCookie(res, token, expiresAt) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    domain: process.env.NODE_ENV === 'production' ? '.fairybloom.cz' : 'localhost',
    path: '/',
    expires: new Date(expiresAt)
  };

  // Set the cookie
  res.setHeader('Set-Cookie', [
    `shopify_access_token=${token}; ${Object.entries(cookieOptions)
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
 * Get authentication token from cookie
 * @param {Object} req - Request object
 * @returns {string|null} - Access token or null if not found
 */
export function getAuthCookie(req) {
  const cookies = req.headers.cookie;
  if (!cookies) return null;

  const tokenMatch = cookies.match(/shopify_access_token=([^;]+)/);
  return tokenMatch ? tokenMatch[1] : null;
}

/**
 * Clear authentication cookie
 * @param {Object} res - Response object
 */
export function clearAuthCookie(res) {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
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
    sameSite: 'Lax',
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
