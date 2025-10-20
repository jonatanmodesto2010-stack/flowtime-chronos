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
    const eventId = pathParts[pathParts.length - 1];
    const timelineId = url.searchParams.get('timeline_id');

    // GET /events?timeline_id=xxx - List events by timeline
    if (req.method === 'GET' && timelineId) {
      const { data, error } = await supabaseClient
        .from('events')
        .select('*')
        .eq('timeline_id', timelineId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching events:', error);
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

    // GET /events/:id - Get single event
    if (req.method === 'GET' && eventId && !timelineId) {
      const { data, error } = await supabaseClient
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();

      if (error) {
        console.error('Error fetching event:', error);
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

    // POST /events - Create event
    if (req.method === 'POST') {
      const body = await req.json();
      const { timeline_id, icon, icon_size, date, description, position, status } = body;

      if (!timeline_id || !date || !description || !position) {
        return new Response(
          JSON.stringify({ error: 'timeline_id, date, description, and position are required' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const { data, error } = await supabaseClient
        .from('events')
        .insert({
          timeline_id,
          icon: icon || '💬',
          icon_size: icon_size || 'text-2xl',
          date,
          description,
          position,
          status: status || 'pending'
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating event:', error);
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

    // PUT /events/:id - Update event
    if (req.method === 'PUT' && eventId) {
      const body = await req.json();
      const { icon, icon_size, date, description, position, status } = body;

      const updateData: any = {};
      if (icon !== undefined) updateData.icon = icon;
      if (icon_size !== undefined) updateData.icon_size = icon_size;
      if (date !== undefined) updateData.date = date;
      if (description !== undefined) updateData.description = description;
      if (position !== undefined) updateData.position = position;
      if (status !== undefined) updateData.status = status;

      const { data, error } = await supabaseClient
        .from('events')
        .update(updateData)
        .eq('id', eventId)
        .select()
        .single();

      if (error) {
        console.error('Error updating event:', error);
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

    // DELETE /events/:id - Delete event
    if (req.method === 'DELETE' && eventId) {
      const { error } = await supabaseClient
        .from('events')
        .delete()
        .eq('id', eventId);

      if (error) {
        console.error('Error deleting event:', error);
        return new Response(
          JSON.stringify({ error: error.message }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ message: 'Event deleted successfully' }),
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
