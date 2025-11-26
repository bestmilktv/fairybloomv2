/**
 * Customer Profile Supabase API
 * Handles both saving and loading customer profiles from Supabase
 * 
 * POST /api/customer - Save customer profile to Supabase
 * GET /api/customer - Load customer profile from Supabase
 */

import { getAuthCookie } from '../utils/cookies.js';
import { getSupabaseAdmin } from '../utils/supabase.js';

export default async function handler(req, res) {
  // Verify authentication
  const authData = getAuthCookie(req);
  
  if (!authData || !authData.customer || !authData.customer.sub) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const shopifyCustomerId = String(authData.customer.sub);
  const email = authData.customer.email;

  // ========== POST: SAVE CUSTOMER PROFILE ==========
  if (req.method === 'POST') {
    try {
      if (!email && !req.body.email) {
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
        email: email || req.body.email,
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
        email: email || req.body.email
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

  // ========== GET: LOAD CUSTOMER PROFILE ==========
  if (req.method === 'GET') {
    try {
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

  // ========== METHOD NOT ALLOWED ==========
  return res.status(405).json({ error: 'Method not allowed' });
}

