-- Create companies table
CREATE TABLE public.companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  document TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;

-- Create user_companies junction table to link users to companies
CREATE TABLE public.user_companies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id)
);

-- Enable RLS on user_companies
ALTER TABLE public.user_companies ENABLE ROW LEVEL SECURITY;

-- Create security definer function to get user's company_id
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

-- Add company_id to existing tables
ALTER TABLE public.clients ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.quotes ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.active_orders ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.financial_transactions ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;
ALTER TABLE public.supplies ADD COLUMN company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Create indexes for better performance
CREATE INDEX idx_clients_company_id ON public.clients(company_id);
CREATE INDEX idx_quotes_company_id ON public.quotes(company_id);
CREATE INDEX idx_active_orders_company_id ON public.active_orders(company_id);
CREATE INDEX idx_financial_transactions_company_id ON public.financial_transactions(company_id);
CREATE INDEX idx_supplies_company_id ON public.supplies(company_id);
CREATE INDEX idx_user_companies_user_id ON public.user_companies(user_id);
CREATE INDEX idx_user_companies_company_id ON public.user_companies(company_id);

-- Drop old RLS policies and create new ones with company filtering

-- Clients policies
DROP POLICY IF EXISTS "Authenticated users can manage clients" ON public.clients;
CREATE POLICY "Users can manage their company clients"
ON public.clients
FOR ALL
USING (company_id = public.get_user_company_id(auth.uid()))
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

-- Quotes policies
DROP POLICY IF EXISTS "Authenticated users can manage quotes" ON public.quotes;
CREATE POLICY "Users can manage their company quotes"
ON public.quotes
FOR ALL
USING (company_id = public.get_user_company_id(auth.uid()))
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

-- Active orders policies
DROP POLICY IF EXISTS "Authenticated users can manage orders" ON public.active_orders;
CREATE POLICY "Users can manage their company orders"
ON public.active_orders
FOR ALL
USING (company_id = public.get_user_company_id(auth.uid()))
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

-- Financial transactions policies
DROP POLICY IF EXISTS "Authenticated users can manage transactions" ON public.financial_transactions;
CREATE POLICY "Users can manage their company transactions"
ON public.financial_transactions
FOR ALL
USING (company_id = public.get_user_company_id(auth.uid()))
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

-- Supplies policies
DROP POLICY IF EXISTS "Authenticated users can manage supplies" ON public.supplies;
CREATE POLICY "Users can manage their company supplies"
ON public.supplies
FOR ALL
USING (company_id = public.get_user_company_id(auth.uid()))
WITH CHECK (company_id = public.get_user_company_id(auth.uid()));

-- Quote supplies policies (inherited from quote)
DROP POLICY IF EXISTS "Authenticated users can manage quote_supplies" ON public.quote_supplies;
CREATE POLICY "Users can manage their company quote supplies"
ON public.quote_supplies
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.quotes 
    WHERE quotes.id = quote_supplies.quote_id 
    AND quotes.company_id = public.get_user_company_id(auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quotes 
    WHERE quotes.id = quote_supplies.quote_id 
    AND quotes.company_id = public.get_user_company_id(auth.uid())
  )
);

-- Companies policies
CREATE POLICY "Users can view their own company"
ON public.companies
FOR SELECT
USING (id = public.get_user_company_id(auth.uid()));

-- User companies policies
CREATE POLICY "Users can view their own company associations"
ON public.user_companies
FOR SELECT
USING (user_id = auth.uid());

-- Trigger for updated_at on companies
CREATE TRIGGER update_companies_updated_at
BEFORE UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create a default company and associate the superadmin user
DO $$
DECLARE
  default_company_id UUID;
  superadmin_user_id UUID;
BEGIN
  -- Create default company
  INSERT INTO public.companies (name, document)
  VALUES ('Empresa Padrão', '00.000.000/0000-00')
  RETURNING id INTO default_company_id;
  
  -- Get superadmin user id
  SELECT id INTO superadmin_user_id
  FROM auth.users
  WHERE email = 'superadmin@sistema.local'
  LIMIT 1;
  
  -- Associate superadmin to default company if user exists
  IF superadmin_user_id IS NOT NULL THEN
    INSERT INTO public.user_companies (user_id, company_id)
    VALUES (superadmin_user_id, default_company_id);
  END IF;
END $$;