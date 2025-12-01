-- ========================================
-- 1. CREATE MISSING TABLES
-- ========================================

-- Create enum for user roles
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('superadmin', 'admin', 'user');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create companies table
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  document TEXT,
  slug TEXT UNIQUE,
  logo_url TEXT,
  unlimited_access BOOLEAN DEFAULT false,
  trial_end_date TIMESTAMP WITH TIME ZONE DEFAULT (now() + interval '15 days'),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_companies junction table
CREATE TABLE IF NOT EXISTS public.user_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- Create user_roles table
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create supplies table
CREATE TABLE IF NOT EXISTS public.supplies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT,
  name TEXT NOT NULL,
  cost_value NUMERIC NOT NULL DEFAULT 0,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create quote_supplies junction table
CREATE TABLE IF NOT EXISTS public.quote_supplies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  supply_id UUID NOT NULL REFERENCES public.supplies(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 1,
  adjusted_cost NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create quote_products table
CREATE TABLE IF NOT EXISTS public.quote_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  sale_value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create plans table
CREATE TABLE IF NOT EXISTS public.plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  duration_months INTEGER NOT NULL,
  price NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'trial')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- ========================================
-- 2. ADD COMPANY_ID TO EXISTING TABLES
-- ========================================

ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.quotes ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- ========================================
-- 3. CREATE INDEXES
-- ========================================

CREATE INDEX IF NOT EXISTS idx_customers_company_id ON public.customers(company_id);
CREATE INDEX IF NOT EXISTS idx_quotes_company_id ON public.quotes(company_id);
CREATE INDEX IF NOT EXISTS idx_orders_company_id ON public.orders(company_id);
CREATE INDEX IF NOT EXISTS idx_transactions_company_id ON public.transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_supplies_company_id ON public.supplies(company_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_user_id ON public.user_companies(user_id);
CREATE INDEX IF NOT EXISTS idx_user_companies_company_id ON public.user_companies(company_id);
CREATE INDEX IF NOT EXISTS idx_quote_supplies_quote_id ON public.quote_supplies(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_supplies_supply_id ON public.quote_supplies(supply_id);
CREATE INDEX IF NOT EXISTS idx_quote_products_quote_id ON public.quote_products(quote_id);
CREATE INDEX IF NOT EXISTS idx_companies_unlimited_access ON public.companies(unlimited_access);

-- ========================================
-- 4. CREATE SECURITY DEFINER FUNCTIONS
-- ========================================

-- Function to get user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id 
  FROM public.user_companies 
  WHERE user_id = _user_id 
  LIMIT 1
$$;

-- Function to check if user has a role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- ========================================
-- 5. CREATE SEQUENCES FOR CODE GENERATION
-- ========================================

CREATE SEQUENCE IF NOT EXISTS customer_code_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS quote_code_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS order_code_seq START WITH 1;
CREATE SEQUENCE IF NOT EXISTS supply_code_seq START WITH 1;

-- ========================================
-- 6. CREATE CODE GENERATION FUNCTIONS
-- ========================================

CREATE OR REPLACE FUNCTION public.generate_customer_code()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.code IS NULL THEN
    NEW.code := 'CLI-' || LPAD(NEXTVAL('customer_code_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_quote_code()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.code IS NULL THEN
    NEW.code := 'ORC-' || LPAD(NEXTVAL('quote_code_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_order_code()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.code IS NULL THEN
    NEW.code := 'PED-' || LPAD(NEXTVAL('order_code_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_supply_code()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.code IS NULL THEN
    NEW.code := 'INS-' || LPAD(NEXTVAL('supply_code_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- ========================================
-- 7. CREATE TRIGGERS FOR CODE GENERATION
-- ========================================

DROP TRIGGER IF EXISTS set_customer_code ON public.customers;
CREATE TRIGGER set_customer_code
  BEFORE INSERT ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION generate_customer_code();

DROP TRIGGER IF EXISTS set_quote_code ON public.quotes;
CREATE TRIGGER set_quote_code
  BEFORE INSERT ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION generate_quote_code();

DROP TRIGGER IF EXISTS set_order_code ON public.orders;
CREATE TRIGGER set_order_code
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_order_code();

DROP TRIGGER IF EXISTS set_supply_code ON public.supplies;
CREATE TRIGGER set_supply_code
  BEFORE INSERT ON public.supplies
  FOR EACH ROW
  EXECUTE FUNCTION generate_supply_code();

-- ========================================
-- 8. CREATE TRIGGERS FOR UPDATED_AT
-- ========================================

DROP TRIGGER IF EXISTS update_companies_updated_at ON public.companies;
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_supplies_updated_at ON public.supplies;
CREATE TRIGGER update_supplies_updated_at
BEFORE UPDATE ON public.supplies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_subscriptions_updated_at ON public.subscriptions;
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ========================================
-- 9. ENABLE ROW LEVEL SECURITY
-- ========================================

ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 10. CREATE RLS POLICIES
-- ========================================

-- Companies policies
CREATE POLICY "Superadmins can manage all companies"
ON public.companies FOR ALL
USING (has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Users can view their own company"
ON public.companies FOR SELECT
USING (id = get_user_company_id(auth.uid()));

-- User companies policies
CREATE POLICY "Users can view their own company associations"
ON public.user_companies FOR SELECT
USING (user_id = auth.uid());

-- User roles policies
CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
USING (user_id = auth.uid() OR has_role(auth.uid(), 'superadmin') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Superadmins can manage all roles"
ON public.user_roles FOR ALL
USING (has_role(auth.uid(), 'superadmin'));

-- Supplies policies
CREATE POLICY "Users can manage their company supplies"
ON public.supplies FOR ALL
USING (company_id = get_user_company_id(auth.uid()))
WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- Quote supplies policies
CREATE POLICY "Users can manage their company quote supplies"
ON public.quote_supplies FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.quotes 
    WHERE quotes.id = quote_supplies.quote_id 
    AND quotes.company_id = get_user_company_id(auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quotes 
    WHERE quotes.id = quote_supplies.quote_id 
    AND quotes.company_id = get_user_company_id(auth.uid())
  )
);

-- Quote products policies
CREATE POLICY "Users can manage their company quote products"
ON public.quote_products FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.quotes
    WHERE quotes.id = quote_products.quote_id
    AND quotes.company_id = get_user_company_id(auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quotes
    WHERE quotes.id = quote_products.quote_id
    AND quotes.company_id = get_user_company_id(auth.uid())
  )
);

-- Plans policies
CREATE POLICY "Everyone can view plans"
ON public.plans FOR SELECT
USING (true);

-- Subscriptions policies
CREATE POLICY "Users can view their company subscriptions"
ON public.subscriptions FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Superadmins can manage all subscriptions"
ON public.subscriptions FOR ALL
USING (has_role(auth.uid(), 'superadmin'));

-- Update existing table policies to use company_id
DROP POLICY IF EXISTS "Permitir todas operações em customers" ON public.customers;
CREATE POLICY "Users can manage their company customers"
ON public.customers FOR ALL
USING (company_id = get_user_company_id(auth.uid()))
WITH CHECK (company_id = get_user_company_id(auth.uid()));

DROP POLICY IF EXISTS "Permitir todas operações em quotes" ON public.quotes;
CREATE POLICY "Users can manage their company quotes"
ON public.quotes FOR ALL
USING (company_id = get_user_company_id(auth.uid()))
WITH CHECK (company_id = get_user_company_id(auth.uid()));

DROP POLICY IF EXISTS "Permitir todas operações em orders" ON public.orders;
CREATE POLICY "Users can manage their company orders"
ON public.orders FOR ALL
USING (company_id = get_user_company_id(auth.uid()))
WITH CHECK (company_id = get_user_company_id(auth.uid()));

DROP POLICY IF EXISTS "Permitir todas operações em transactions" ON public.transactions;
CREATE POLICY "Users can manage their company transactions"
ON public.transactions FOR ALL
USING (company_id = get_user_company_id(auth.uid()))
WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- ========================================
-- 11. INSERT DEFAULT DATA
-- ========================================

-- Insert default plans
INSERT INTO public.plans (name, duration_months, price) 
VALUES
  ('Mensal', 1, 99.90),
  ('Trimestral', 3, 269.70),
  ('Semestral', 6, 509.40),
  ('Anual', 12, 959.40)
ON CONFLICT DO NOTHING;

-- Create default company
DO $$
DECLARE
  default_company_id UUID;
  superadmin_user_id UUID;
BEGIN
  -- Check if default company already exists
  SELECT id INTO default_company_id
  FROM public.companies
  WHERE slug = 'empresa-padrao'
  LIMIT 1;
  
  -- Create default company if it doesn't exist
  IF default_company_id IS NULL THEN
    INSERT INTO public.companies (name, document, slug)
    VALUES ('Empresa Padrão', '00.000.000/0000-00', 'empresa-padrao')
    RETURNING id INTO default_company_id;
  END IF;
  
  -- Get superadmin user id
  SELECT id INTO superadmin_user_id
  FROM auth.users
  WHERE email = 'superadmin@sistema.local'
  LIMIT 1;
  
  -- Associate superadmin to default company if user exists
  IF superadmin_user_id IS NOT NULL THEN
    INSERT INTO public.user_companies (user_id, company_id)
    VALUES (superadmin_user_id, default_company_id)
    ON CONFLICT DO NOTHING;
    
    -- Assign superadmin role
    INSERT INTO public.user_roles (user_id, role)
    VALUES (superadmin_user_id, 'superadmin'::app_role)
    ON CONFLICT DO NOTHING;
  END IF;
  
  -- Link all existing data to default company
  IF default_company_id IS NOT NULL THEN
    UPDATE public.customers SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE public.quotes SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE public.orders SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE public.transactions SET company_id = default_company_id WHERE company_id IS NULL;
  END IF;
END $$;