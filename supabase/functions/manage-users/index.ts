import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.77.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create client with anon key to verify the user
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader },
        },
      }
    );

    // Get the authenticated user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('User authentication error:', userError);
      throw new Error('User not authenticated');
    }

    console.log('Authenticated user:', user.id);

    // Check if user has admin or superadmin role
    const { data: roleData, error: roleError } = await supabaseClient
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !roleData) {
      console.error('Role check error:', roleError);
      throw new Error('User not allowed');
    }

    const userRole = roleData.role;
    console.log('User role:', userRole);

    if (userRole !== 'admin' && userRole !== 'superadmin') {
      throw new Error('User not allowed');
    }

    // Create admin client with service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    const { action, ...body } = await req.json();
    console.log('Action:', action, 'Body:', body);

    switch (action) {
      case 'list': {
        const { data, error } = await supabaseAdmin.auth.admin.listUsers();
        if (error) {
          console.error('List users error:', error);
          throw error;
        }
        console.log('Listed users:', data.users.length);
        return new Response(
          JSON.stringify({ users: data.users }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      case 'create': {
        const { email, password, role, company_id } = body;

        // Create user
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });

        if (createError) {
          console.error('Create user error:', createError);
          throw createError;
        }

        console.log('Created user:', newUser.user.id);

        // Assign role
        const { error: roleError } = await supabaseClient
          .from('user_roles')
          .insert([{ user_id: newUser.user.id, role }]);

        if (roleError) {
          console.error('Assign role error:', roleError);
          // Rollback: delete the user if role assignment fails
          await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
          throw roleError;
        }

        // Link to company
        const { error: companyError } = await supabaseClient
          .from('user_companies')
          .insert([{ user_id: newUser.user.id, company_id }]);

        if (companyError) {
          console.error('Link company error:', companyError);
          // Rollback: delete the user if company link fails
          await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
          throw companyError;
        }

        console.log('User created successfully');
        return new Response(
          JSON.stringify({ user: newUser.user }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      case 'delete': {
        const { userId } = body;
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (error) {
          console.error('Delete user error:', error);
          throw error;
        }
        console.log('Deleted user:', userId);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }

      default:
        throw new Error('Invalid action');
    }
  } catch (error) {
    console.error('Function error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
})
