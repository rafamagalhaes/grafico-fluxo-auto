import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type SubscriptionStatus = "trial" | "active" | "expired" | "unlimited";

export function useSubscription() {
  return useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");

      // Check if user is superadmin
      const { data: userRole } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (userRole?.role === "superadmin") {
        return {
          status: "unlimited" as SubscriptionStatus,
          isActive: true,
          subscription: null,
          trialEndDate: null,
          isSuperadmin: true,
        };
      }

      const { data: userCompany } = await supabase
        .from("user_companies")
        .select("company_id, companies(trial_end_date, unlimited_access)")
        .eq("user_id", user.id)
        .single();

      if (!userCompany) throw new Error("No company found");

      // Check if company has unlimited access
      if (userCompany.companies.unlimited_access) {
        return {
          status: "unlimited" as SubscriptionStatus,
          isActive: true,
          subscription: null,
          trialEndDate: null,
          hasUnlimitedAccess: true,
        };
      }

      const { data: subscription } = await supabase
        .from("subscriptions")
        .select("*, plans(name, duration_months, price)")
        .eq("company_id", userCompany.company_id)
        .eq("status", "active")
        .single();

      const now = new Date();
      const trialEndDate = new Date(userCompany.companies.trial_end_date);
      
      if (subscription && new Date(subscription.end_date) > now) {
        return {
          status: "active" as SubscriptionStatus,
          isActive: true,
          subscription,
          trialEndDate,
        };
      }

      if (trialEndDate > now) {
        return {
          status: "trial" as SubscriptionStatus,
          isActive: true,
          subscription: null,
          trialEndDate,
        };
      }

      return {
        status: "expired" as SubscriptionStatus,
        isActive: false,
        subscription: null,
        trialEndDate,
      };
    },
    staleTime: 60 * 1000, // Cache for 1 minute
  });
}
