import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )
    
    const { version, buildVersion, buildTime } = await req.json()
    
    console.log('Registering new version:', { version, buildVersion, buildTime });
    
    // Deactivate previous versions
    const { error: updateError } = await supabaseAdmin
      .from('app_versions')
      .update({ is_active: false })
      .eq('is_active', true)
    
    if (updateError) {
      console.error('Error deactivating old versions:', updateError);
    }
    
    // Register new version
    const { data, error } = await supabaseAdmin
      .from('app_versions')
      .insert({
        version,
        build_version: buildVersion,
        build_time: buildTime,
        is_active: true,
      })
      .select()
      .single()
    
    if (error) {
      console.error('Error inserting new version:', error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    
    console.log('Version registered successfully:', data);
    
    return new Response(JSON.stringify({ success: true, data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('Unexpected error:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
