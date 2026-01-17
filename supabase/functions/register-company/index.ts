import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "https://esm.sh/zod@3.22.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const registerSchema = z.object({
  company_name: z.string().min(2, "Nome da empresa deve ter no mínimo 2 caracteres"),
  cnpj: z.string().min(14, "CNPJ inválido").max(14, "CNPJ inválido"),
  email: z.string().email("Email inválido"),
  password: z.string().min(8, "Senha deve ter no mínimo 8 caracteres"),
});

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Registration request received:", { 
      company_name: body.company_name, 
      cnpj: body.cnpj, 
      email: body.email 
    });

    // Validate input
    const validatedData = registerSchema.parse(body);

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Check if CNPJ already exists
    const { data: existingCompany, error: checkError } = await supabaseAdmin
      .from("companies")
      .select("id")
      .eq("document", validatedData.cnpj)
      .maybeSingle();

    if (checkError) {
      console.error("Error checking existing company:", checkError);
      throw new Error("Erro ao verificar CNPJ");
    }

    if (existingCompany) {
      console.log("Company with CNPJ already exists:", validatedData.cnpj);
      return new Response(
        JSON.stringify({ error: "CNPJ já cadastrado no sistema" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Check if email already exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers();
    const emailExists = existingUser?.users?.some(
      (user) => user.email?.toLowerCase() === validatedData.email.toLowerCase()
    );

    if (emailExists) {
      console.log("Email already exists:", validatedData.email);
      return new Response(
        JSON.stringify({ error: "Email já cadastrado no sistema" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Calculate trial end date (30 days from now)
    const trialEndDate = new Date();
    trialEndDate.setDate(trialEndDate.getDate() + 30);

    // Create the company
    const { data: newCompany, error: companyError } = await supabaseAdmin
      .from("companies")
      .insert({
        name: validatedData.company_name,
        document: validatedData.cnpj,
        trial_end_date: trialEndDate.toISOString(),
      })
      .select()
      .single();

    if (companyError) {
      console.error("Error creating company:", companyError);
      throw new Error("Erro ao criar empresa");
    }

    console.log("Company created:", newCompany.id);

    // Create the user
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email: validatedData.email,
      password: validatedData.password,
      email_confirm: true,
    });

    if (userError) {
      console.error("Error creating user:", userError);
      // Rollback: delete the company
      await supabaseAdmin.from("companies").delete().eq("id", newCompany.id);
      throw new Error("Erro ao criar usuário: " + userError.message);
    }

    console.log("User created:", userData.user.id);

    // Link user to company
    const { error: linkError } = await supabaseAdmin
      .from("user_companies")
      .insert({
        user_id: userData.user.id,
        company_id: newCompany.id,
      });

    if (linkError) {
      console.error("Error linking user to company:", linkError);
      // Rollback: delete user and company
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
      await supabaseAdmin.from("companies").delete().eq("id", newCompany.id);
      throw new Error("Erro ao vincular usuário à empresa");
    }

    console.log("User linked to company");

    // Assign admin role to user
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({
        user_id: userData.user.id,
        role: "admin",
      });

    if (roleError) {
      console.error("Error assigning role:", roleError);
      // Rollback everything
      await supabaseAdmin.from("user_companies").delete().eq("user_id", userData.user.id);
      await supabaseAdmin.auth.admin.deleteUser(userData.user.id);
      await supabaseAdmin.from("companies").delete().eq("id", newCompany.id);
      throw new Error("Erro ao atribuir permissões");
    }

    console.log("Admin role assigned to user");

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "Cadastro realizado com sucesso",
        company_id: newCompany.id,
        user_id: userData.user.id,
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  } catch (error) {
    console.error("Registration error:", error);

    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ error: error.errors[0].message }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Erro interno do servidor" }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});
