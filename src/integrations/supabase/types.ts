export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      active_orders: {
        Row: {
          advance_value: number | null
          code: string | null
          company_id: string | null
          created_at: string | null
          delivery_date: string
          description: string
          has_advance: boolean | null
          id: string
          pending_value: number | null
          quote_id: string | null
          status: string | null
          total_value: number
          updated_at: string | null
        }
        Insert: {
          advance_value?: number | null
          code?: string | null
          company_id?: string | null
          created_at?: string | null
          delivery_date: string
          description: string
          has_advance?: boolean | null
          id?: string
          pending_value?: number | null
          quote_id?: string | null
          status?: string | null
          total_value?: number
          updated_at?: string | null
        }
        Update: {
          advance_value?: number | null
          code?: string | null
          company_id?: string | null
          created_at?: string | null
          delivery_date?: string
          description?: string
          has_advance?: boolean | null
          id?: string
          pending_value?: number | null
          quote_id?: string | null
          status?: string | null
          total_value?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "active_orders_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "active_orders_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          birth_date: string | null
          client_type: string | null
          cnpj: string | null
          code: string | null
          company_id: string | null
          created_at: string | null
          id: string
          name: string
          phone: string
          updated_at: string | null
        }
        Insert: {
          birth_date?: string | null
          client_type?: string | null
          cnpj?: string | null
          code?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          name: string
          phone: string
          updated_at?: string | null
        }
        Update: {
          birth_date?: string | null
          client_type?: string | null
          cnpj?: string | null
          code?: string | null
          company_id?: string | null
          created_at?: string | null
          id?: string
          name?: string
          phone?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          asaas_customer_id: string | null
          created_at: string
          document: string | null
          id: string
          logo_url: string | null
          name: string
          slug: string | null
          trial_end_date: string | null
          unlimited_access: boolean | null
          updated_at: string
        }
        Insert: {
          asaas_customer_id?: string | null
          created_at?: string
          document?: string | null
          id?: string
          logo_url?: string | null
          name: string
          slug?: string | null
          trial_end_date?: string | null
          unlimited_access?: boolean | null
          updated_at?: string
        }
        Update: {
          asaas_customer_id?: string | null
          created_at?: string
          document?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string | null
          trial_end_date?: string | null
          unlimited_access?: boolean | null
          updated_at?: string
        }
        Relationships: []
      }
      financial_transactions: {
        Row: {
          amount: number
          category: string | null
          company_id: string | null
          created_at: string | null
          description: string
          due_date: string
          id: string
          order_id: string | null
          paid: boolean | null
          paid_date: string | null
          type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          description: string
          due_date: string
          id?: string
          order_id?: string | null
          paid?: boolean | null
          paid_date?: string | null
          type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          category?: string | null
          company_id?: string | null
          created_at?: string | null
          description?: string
          due_date?: string
          id?: string
          order_id?: string | null
          paid?: boolean | null
          paid_date?: string | null
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "active_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      plans: {
        Row: {
          created_at: string | null
          duration_months: number
          id: string
          name: string
          price: number
        }
        Insert: {
          created_at?: string | null
          duration_months: number
          id?: string
          name: string
          price: number
        }
        Update: {
          created_at?: string | null
          duration_months?: number
          id?: string
          name?: string
          price?: number
        }
        Relationships: []
      }
      quote_products: {
        Row: {
          created_at: string | null
          id: string
          product_name: string
          quote_id: string
          sale_value: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          product_name: string
          quote_id: string
          sale_value?: number
        }
        Update: {
          created_at?: string | null
          id?: string
          product_name?: string
          quote_id?: string
          sale_value?: number
        }
        Relationships: []
      }
      quote_supplies: {
        Row: {
          adjusted_cost: number | null
          created_at: string | null
          id: string
          quantity: number
          quote_id: string
          supply_id: string
        }
        Insert: {
          adjusted_cost?: number | null
          created_at?: string | null
          id?: string
          quantity?: number
          quote_id: string
          supply_id: string
        }
        Update: {
          adjusted_cost?: number | null
          created_at?: string | null
          id?: string
          quantity?: number
          quote_id?: string
          supply_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quote_supplies_quote_id_fkey"
            columns: ["quote_id"]
            isOneToOne: false
            referencedRelation: "quotes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quote_supplies_supply_id_fkey"
            columns: ["supply_id"]
            isOneToOne: false
            referencedRelation: "supplies"
            referencedColumns: ["id"]
          },
        ]
      }
      quotes: {
        Row: {
          approved: boolean | null
          client_id: string
          code: string | null
          company_id: string | null
          cost_value: number
          created_at: string | null
          delivery_date: string
          description: string
          id: string
          profit_value: number | null
          sale_value: number
          updated_at: string | null
        }
        Insert: {
          approved?: boolean | null
          client_id: string
          code?: string | null
          company_id?: string | null
          cost_value?: number
          created_at?: string | null
          delivery_date: string
          description: string
          id?: string
          profit_value?: number | null
          sale_value?: number
          updated_at?: string | null
        }
        Update: {
          approved?: boolean | null
          client_id?: string
          code?: string | null
          company_id?: string | null
          cost_value?: number
          created_at?: string | null
          delivery_date?: string
          description?: string
          id?: string
          profit_value?: number | null
          sale_value?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "quotes_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quotes_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          asaas_subscription_id: string | null
          company_id: string
          created_at: string | null
          end_date: string
          id: string
          payment_method: string | null
          plan_id: string
          start_date: string
          status: string
          updated_at: string | null
        }
        Insert: {
          asaas_subscription_id?: string | null
          company_id: string
          created_at?: string | null
          end_date: string
          id?: string
          payment_method?: string | null
          plan_id: string
          start_date?: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          asaas_subscription_id?: string | null
          company_id?: string
          created_at?: string | null
          end_date?: string
          id?: string
          payment_method?: string | null
          plan_id?: string
          start_date?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "subscriptions_plan_id_fkey"
            columns: ["plan_id"]
            isOneToOne: false
            referencedRelation: "plans"
            referencedColumns: ["id"]
          },
        ]
      }
      supplies: {
        Row: {
          code: string | null
          company_id: string | null
          cost_value: number
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          code?: string | null
          company_id?: string | null
          cost_value?: number
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          code?: string | null
          company_id?: string | null
          cost_value?: number
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "supplies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_companies: {
        Row: {
          company_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          company_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          company_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_companies_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_user_company_id: { Args: { _user_id: string }; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "superadmin" | "admin" | "user"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["superadmin", "admin", "user"],
    },
  },
} as const
