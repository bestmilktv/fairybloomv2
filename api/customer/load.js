/**
 * Load Customer Profile from Supabase
 * GET /api/customer/load
 * 
 * Loads customer profile data from Supabase database
 * Used as fallback when Shopify API doesn't return data
 */

import { getAuthCookie } from '../utils/cookies.js';
import { getSupabaseAdmin } from '../utils/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authData = getAuthCookie(req);
    
    if (!authData || !authData.customer || !authData.customer.sub) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const shopifyCustomerId = String(authData.customer.sub);

    // Get Supabase client
    const supabase = getSupabaseAdmin();

    // Fetch customer profile from Supabase
    const { data, error } = await supabase
      .from('customer_profiles')
      .select('*')
      .eq('shopify_customer_id', shopifyCustomerId)
      .single();

    if (error) {
      // If no data found, return null (not an error)
      if (error.code === 'PGRST116') {
        console.log('[Supabase Load] No profile found for customer:', shopifyCustomerId);
        return res.status(200).json({ data: null });
      }

      console.error('[Supabase Load] Error:', error);
      return res.status(500).json({ 
        error: 'Failed to load customer profile',
        details: error.message 
      });
    }

    if (!data) {
      console.log('[Supabase Load] No profile found for customer:', shopifyCustomerId);
      return res.status(200).json({ data: null });
    }

    // Transform Supabase data to match expected format
    const customerData = {
      id: shopifyCustomerId,
      email: data.email,
      firstName: data.first_name || '',
      lastName: data.last_name || '',
      address: data.address1 || data.city || data.zip ? {
        address1: data.address1 || '',
        address2: data.address2 || '',
        city: data.city || '',
        province: data.province || '',
        zip: data.zip || '',
        country: data.country || '',
        phone: data.phone || ''
      } : null,
      acceptsMarketing: data.accepts_marketing || false
    };

    console.log('[Supabase Load] Successfully loaded customer profile:', {
      shopify_customer_id: shopifyCustomerId,
      hasName: !!(customerData.firstName && customerData.lastName),
      hasAddress: !!customerData.address
    });

    return res.status(200).json({
      success: true,
      data: customerData,
      source: 'supabase'
    });

  } catch (error) {
    console.error('[Supabase Load] Unexpected error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

