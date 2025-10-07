import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const timelineId = pathParts[pathParts.length - 1];

    // GET /timelines - List all timelines
    if (req.method === 'GET' && !timelineId) {
      const { data, error } = await supabaseClient
        .from('timelines')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching timelines:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /timelines/:id - Get single timeline
    if (req.method === 'GET' && timelineId) {
      const { data, error } = await supabaseClient
        .from('timelines')
        .select('*')
        .eq('id', timelineId)
        .single();

      if (error) {
        console.error('Error fetching timeline:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /timelines - Create timeline
    if (req.method === 'POST') {
      const body = await req.json();
      const { name } = body;

      if (!name) {
        return new Response(
          JSON.stringify({ error: 'Name is required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabaseClient
        .from('timelines')
        .insert({ name, user_id: user.id })
        .select()
        .single();

      if (error) {
        console.error('Error creating timeline:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ data }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PUT /timelines/:id - Update timeline
    if (req.method === 'PUT' && timelineId) {
      const body = await req.json();
      const { name } = body;

      const { data, error } = await supabaseClient
        .from('timelines')
        .update({ name })
        .eq('id', timelineId)
        .select()
        .single();

      if (error) {
        console.error('Error updating timeline:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ data }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE /timelines/:id - Delete timeline
    if (req.method === 'DELETE' && timelineId) {
      const { error } = await supabaseClient
        .from('timelines')
        .delete()
        .eq('id', timelineId);

      if (error) {
        console.error('Error deleting timeline:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ message: 'Timeline deleted successfully' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
