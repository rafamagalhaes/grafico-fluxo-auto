import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface CompanyWithTrial {
  id: string;
  name: string;
  trial_end_date: string;
  unlimited_access: boolean;
}

interface AdminUser {
  user_id: string;
  email: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting trial notification check...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all companies with trial period that don't have unlimited access
    const { data: companies, error: companiesError } = await supabase
      .from("companies")
      .select("id, name, trial_end_date, unlimited_access")
      .eq("unlimited_access", false)
      .not("trial_end_date", "is", null);

    if (companiesError) {
      console.error("Error fetching companies:", companiesError);
      throw companiesError;
    }

    console.log(`Found ${companies?.length || 0} companies to check`);

    const now = new Date();
    const notificationsSent: string[] = [];

    for (const company of companies || []) {
      // Check if company has an active subscription
      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("id, status, end_date")
        .eq("company_id", company.id)
        .eq("status", "active")
        .single();

      // If there's an active subscription that hasn't expired, skip
      if (subscription && new Date(subscription.end_date) > now) {
        console.log(`Company ${company.name} has active subscription, skipping`);
        continue;
      }

      const trialEndDate = new Date(company.trial_end_date);
      const daysRemaining = Math.ceil((trialEndDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      console.log(`Company ${company.name}: ${daysRemaining} days remaining in trial`);

      // Determine if notification should be sent
      let shouldNotify = false;
      let notificationType = "";

      if (daysRemaining === 10) {
        shouldNotify = true;
        notificationType = "10_days";
      } else if (daysRemaining === 5) {
        shouldNotify = true;
        notificationType = "5_days";
      } else if (daysRemaining <= 4 && daysRemaining >= 0) {
        shouldNotify = true;
        notificationType = "daily";
      }

      if (!shouldNotify) {
        continue;
      }

      // Get admin users for this company
      const { data: userCompanies, error: userCompaniesError } = await supabase
        .from("user_companies")
        .select("user_id")
        .eq("company_id", company.id);

      if (userCompaniesError) {
        console.error(`Error fetching users for company ${company.name}:`, userCompaniesError);
        continue;
      }

      // Get admin users
      const adminUsers: AdminUser[] = [];
      for (const uc of userCompanies || []) {
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", uc.user_id)
          .single();

        if (roleData?.role === "admin" || roleData?.role === "superadmin") {
          // Get user email from auth
          const { data: userData } = await supabase.auth.admin.getUserById(uc.user_id);
          if (userData?.user?.email) {
            adminUsers.push({
              user_id: uc.user_id,
              email: userData.user.email,
            });
          }
        }
      }

      console.log(`Found ${adminUsers.length} admin users for company ${company.name}`);

      // Send email to each admin
      for (const admin of adminUsers) {
        const subject = daysRemaining <= 0
          ? `🚨 Seu período de degustação expirou - ${company.name}`
          : daysRemaining === 1
            ? `⚠️ Último dia do período de degustação - ${company.name}`
            : `⏰ Restam ${daysRemaining} dias do período de degustação - ${company.name}`;

        const message = daysRemaining <= 0
          ? `O período de degustação da empresa ${company.name} expirou. Para continuar utilizando o sistema, por favor assine um de nossos planos.`
          : daysRemaining === 1
            ? `Este é o último dia do período de degustação da empresa ${company.name}. Assine agora para não perder o acesso!`
            : `Restam apenas ${daysRemaining} dias do período de degustação da empresa ${company.name}. Não perca acesso ao sistema, assine agora!`;

        try {
          const emailResponse = await resend.emails.send({
            from: "Graficontrol <onboarding@resend.dev>",
            to: [admin.email],
            subject: subject,
            html: `
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="utf-8">
                <style>
                  body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                  .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                  .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
                  .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
                  .cta-button { display: inline-block; background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px; }
                  .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
                  .days-badge { background: ${daysRemaining <= 1 ? '#ef4444' : daysRemaining <= 5 ? '#f59e0b' : '#3b82f6'}; color: white; padding: 8px 16px; border-radius: 20px; display: inline-block; font-weight: bold; }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="header">
                    <h1>Graficontrol</h1>
                  </div>
                  <div class="content">
                    <p>Olá,</p>
                    <p>${message}</p>
                    
                    <p style="text-align: center;">
                      <span class="days-badge">
                        ${daysRemaining <= 0 ? 'Expirado' : daysRemaining === 1 ? 'Último dia!' : `${daysRemaining} dias restantes`}
                      </span>
                    </p>
                    
                    <h3>Nossos Planos:</h3>
                    <ul>
                      <li><strong>Mensal</strong> - R$ 49,90/mês</li>
                      <li><strong>Trimestral</strong> - R$ 44,90/mês (economia de 10%)</li>
                      <li><strong>Semestral</strong> - R$ 39,90/mês (economia de 20%)</li>
                      <li><strong>Anual</strong> - R$ 34,90/mês (economia de 30%)</li>
                    </ul>
                    
                    <p style="text-align: center;">
                      <a href="https://lvncdyzmmlnfvgxzfrzv.lovable.app/assinaturas" class="cta-button">
                        Assinar Agora
                      </a>
                    </p>
                  </div>
                  <div class="footer">
                    <p>© ${new Date().getFullYear()} Graficontrol. Todos os direitos reservados.</p>
                  </div>
                </div>
              </body>
              </html>
            `,
          });

          console.log(`Email sent to ${admin.email}:`, emailResponse);
          notificationsSent.push(`${company.name} - ${admin.email}`);
        } catch (emailError) {
          console.error(`Error sending email to ${admin.email}:`, emailError);
        }
      }
    }

    console.log(`Notifications sent: ${notificationsSent.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        notificationsSent: notificationsSent.length,
        details: notificationsSent,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  } catch (error: any) {
    console.error("Error in send-trial-notifications:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
