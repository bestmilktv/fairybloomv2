/**
 * Save Customer Profile to Supabase
 * POST /api/customer/save
 * 
 * Saves customer profile data to Supabase database
 * Called after successful save to Shopify
 */

import { getAuthCookie } from '../utils/cookies.js';
import { getSupabaseAdmin } from '../utils/supabase.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Verify authentication
    const authData = getAuthCookie(req);
    
    if (!authData || !authData.customer || !authData.customer.sub) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const shopifyCustomerId = String(authData.customer.sub);
    const email = authData.customer.email || req.body.email;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Get data from request body
    const {
      firstName,
      lastName,
      address1,
      address2,
      city,
      province,
      zip,
      country,
      phone,
      acceptsMarketing
    } = req.body;

    // Validate required fields
    if (!firstName || !lastName) {
      return res.status(400).json({ error: 'First name and last name are required' });
    }

    if (!address1 || !city || !zip || !country) {
      return res.status(400).json({ error: 'Address fields are required' });
    }

    // Get Supabase client
    const supabase = getSupabaseAdmin();

    // Prepare data for insertion/update
    const profileData = {
      shopify_customer_id: shopifyCustomerId,
      email: email,
      first_name: firstName || null,
      last_name: lastName || null,
      address1: address1 || null,
      address2: address2 || null,
      city: city || null,
      province: province || null,
      zip: zip || null,
      country: country || null,
      phone: phone || null,
      accepts_marketing: acceptsMarketing || false,
      last_synced_with_shopify: new Date().toISOString()
    };

    // Use upsert (insert or update if exists)
    const { data, error } = await supabase
      .from('customer_profiles')
      .upsert(profileData, {
        onConflict: 'shopify_customer_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) {
      console.error('[Supabase Save] Error:', error);
      return res.status(500).json({ 
        error: 'Failed to save customer profile',
        details: error.message 
      });
    }

    console.log('[Supabase Save] Successfully saved customer profile:', {
      shopify_customer_id: shopifyCustomerId,
      email: email
    });

    return res.status(200).json({
      success: true,
      message: 'Customer profile saved successfully',
      data: data
    });

  } catch (error) {
    console.error('[Supabase Save] Unexpected error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
}

