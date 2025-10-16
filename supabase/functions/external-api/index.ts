import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const path = url.pathname.replace('/external-api/', '');
    const method = req.method;

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Verify JWT token from Authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Missing or invalid Authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's organization
    const { data: userRole } = await supabase
      .from('user_roles')
      .select('organization_id')
      .eq('user_id', user.id)
      .single();

    if (!userRole?.organization_id) {
      return new Response(
        JSON.stringify({ error: 'User has no organization' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const organizationId = userRole.organization_id;

    // =====================
    // CLIENTS ENDPOINTS
    // =====================

    // GET /clients - List all clients
    if (path === 'clients' && method === 'GET') {
      const { data, error } = await supabase
        .from('client_timelines')
        .select('*')
        .eq('organization_id', organizationId)
        .order('client_name', { ascending: true });

      if (error) throw error;

      return new Response(
        JSON.stringify({ data, count: data?.length || 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /clients/:id - Get specific client
    if (path.match(/^clients\/[a-f0-9-]+$/) && method === 'GET') {
      const clientId = path.split('/')[1];

      const { data, error } = await supabase
        .from('client_timelines')
        .select('*')
        .eq('id', clientId)
        .eq('organization_id', organizationId)
        .single();

      if (error) throw error;

      // Get tags
      const { data: tags } = await supabase
        .from('client_timeline_tags')
        .select('tag_id, tags(name, color)')
        .eq('timeline_id', clientId);

      // Get boletos
      const { data: boletos } = await supabase
        .from('client_boletos')
        .select('*')
        .eq('timeline_id', clientId);

      // Count events
      const { data: lines } = await supabase
        .from('timeline_lines')
        .select('id')
        .eq('timeline_id', clientId);

      let eventsCount = 0;
      if (lines && lines.length > 0) {
        const lineIds = lines.map(l => l.id);
        const { count } = await supabase
          .from('timeline_events')
          .select('*', { count: 'exact', head: true })
          .in('line_id', lineIds);
        eventsCount = count || 0;
      }

      return new Response(
        JSON.stringify({
          ...data,
          tags: tags?.map(t => t.tags) || [],
          boletos_count: boletos?.length || 0,
          events_count: eventsCount,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /clients - Create new client
    if (path === 'clients' && method === 'POST') {
      const body = await req.json();
      
      const { data, error } = await supabase
        .from('client_timelines')
        .insert({
          organization_id: organizationId,
          user_id: user.id,
          client_name: body.client_name,
          client_id: body.client_id || null,
          start_date: body.start_date || new Date().toISOString().split('T')[0],
          is_active: body.is_active !== undefined ? body.is_active : true,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ data, message: 'Client created successfully' }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // PUT /clients/:id - Update client
    if (path.match(/^clients\/[a-f0-9-]+$/) && method === 'PUT') {
      const clientId = path.split('/')[1];
      const body = await req.json();

      const { data, error } = await supabase
        .from('client_timelines')
        .update({
          client_name: body.client_name,
          is_active: body.is_active,
          client_id: body.client_id,
        })
        .eq('id', clientId)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ data, message: 'Client updated successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // DELETE /clients/:id - Delete client
    if (path.match(/^clients\/[a-f0-9-]+$/) && method === 'DELETE') {
      const clientId = path.split('/')[1];

      const { error } = await supabase
        .from('client_timelines')
        .delete()
        .eq('id', clientId)
        .eq('organization_id', organizationId);

      if (error) throw error;

      return new Response(
        JSON.stringify({ message: 'Client deleted successfully' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =====================
    // TIMELINE ENDPOINTS
    // =====================

    // GET /clients/:id/timeline - Get client's complete timeline
    if (path.match(/^clients\/[a-f0-9-]+\/timeline$/) && method === 'GET') {
      const clientId = path.split('/')[1];

      const { data: lines, error: linesError } = await supabase
        .from('timeline_lines')
        .select('*')
        .eq('timeline_id', clientId)
        .order('position', { ascending: true });

      if (linesError) throw linesError;

      const linesWithEvents = await Promise.all(
        (lines || []).map(async (line: any) => {
          const { data: events } = await supabase
            .from('timeline_events')
            .select('*')
            .eq('line_id', line.id)
            .order('event_order', { ascending: true });

          return {
            ...line,
            events: events || [],
          };
        })
      );

      return new Response(
        JSON.stringify({ data: linesWithEvents }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GET /clients/:id/timeline/events - Get all client events
    if (path.match(/^clients\/[a-f0-9-]+\/timeline\/events$/) && method === 'GET') {
      const clientId = path.split('/')[1];

      const { data: lines } = await supabase
        .from('timeline_lines')
        .select('id')
        .eq('timeline_id', clientId);

      if (!lines || lines.length === 0) {
        return new Response(
          JSON.stringify({ data: [] }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const lineIds = lines.map(l => l.id);

      const { data: events, error } = await supabase
        .from('timeline_events')
        .select('*')
        .in('line_id', lineIds)
        .order('event_date', { ascending: false });

      if (error) throw error;

      return new Response(
        JSON.stringify({ data: events || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /clients/:id/timeline/events - Create event
    if (path.match(/^clients\/[a-f0-9-]+\/timeline\/events$/) && method === 'POST') {
      const clientId = path.split('/')[1];
      const body = await req.json();

      // Get or create timeline line
      let { data: line } = await supabase
        .from('timeline_lines')
        .select('id')
        .eq('timeline_id', clientId)
        .eq('position', body.line_position || 0)
        .single();

      if (!line) {
        const { data: newLine } = await supabase
          .from('timeline_lines')
          .insert({
            timeline_id: clientId,
            position: body.line_position || 0,
          })
          .select()
          .single();
        line = newLine;
      }

      if (!line) {
        return new Response(
          JSON.stringify({ error: 'Failed to get or create line' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
        );
      }

      const { data, error } = await supabase
        .from('timeline_events')
        .insert({
          line_id: line.id,
          event_date: body.event_date,
          event_time: body.event_time || null,
          description: body.description || null,
          position: body.position || 'top',
          status: body.status || 'created',
          icon: body.icon || '💬',
          icon_size: body.icon_size || 'text-2xl',
          event_order: body.event_order || 0,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ data, message: 'Event created successfully' }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =====================
    // BOLETOS ENDPOINTS
    // =====================

    // GET /clients/:id/boletos - List client boletos
    if (path.match(/^clients\/[a-f0-9-]+\/boletos$/) && method === 'GET') {
      const clientId = path.split('/')[1];

      const { data, error } = await supabase
        .from('client_boletos')
        .select('*')
        .eq('timeline_id', clientId)
        .order('due_date', { ascending: true });

      if (error) throw error;

      return new Response(
        JSON.stringify({ data: data || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /clients/:id/boletos - Create boleto
    if (path.match(/^clients\/[a-f0-9-]+\/boletos$/) && method === 'POST') {
      const clientId = path.split('/')[1];
      const body = await req.json();

      const { data, error } = await supabase
        .from('client_boletos')
        .insert({
          timeline_id: clientId,
          boleto_value: body.boleto_value,
          due_date: body.due_date,
          status: body.status || 'pendente',
          description: body.description || null,
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ data, message: 'Boleto created successfully' }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =====================
    // TAGS ENDPOINTS
    // =====================

    // GET /tags - List organization tags
    if (path === 'tags' && method === 'GET') {
      const { data, error } = await supabase
        .from('tags')
        .select('*')
        .eq('organization_id', organizationId)
        .order('name');

      if (error) throw error;

      return new Response(
        JSON.stringify({ data: data || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // POST /tags - Create tag
    if (path === 'tags' && method === 'POST') {
      const body = await req.json();

      const { data, error } = await supabase
        .from('tags')
        .insert({
          organization_id: organizationId,
          name: body.name,
          color: body.color || '#ef4444',
        })
        .select()
        .single();

      if (error) throw error;

      return new Response(
        JSON.stringify({ data, message: 'Tag created successfully' }),
        { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // =====================
    // ANALYSIS ENDPOINTS
    // =====================

    // GET /clients/:id/analysis - Get analysis history
    if (path.match(/^clients\/[a-f0-9-]+\/analysis$/) && method === 'GET') {
      const clientId = path.split('/')[1];

      const { data, error } = await supabase
        .from('client_analysis_history')
        .select('*')
        .eq('timeline_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return new Response(
        JSON.stringify({ data: data || [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Not found
    return new Response(
      JSON.stringify({ error: 'Endpoint not found' }),
      { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('External API Error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
