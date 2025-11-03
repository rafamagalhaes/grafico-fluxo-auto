-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('superadmin', 'admin', 'user');

-- Create user_roles table
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles
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

-- Add slug column to companies for URL segmentation
ALTER TABLE public.companies ADD COLUMN slug TEXT UNIQUE;

-- Update default company with slug
UPDATE public.companies 
SET slug = 'empresa-padrao' 
WHERE name = 'Empresa Padrão';

-- Assign superadmin role to the default user
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'superadmin'::app_role
FROM auth.users
WHERE email = 'superadmin@sistema.local'
ON CONFLICT DO NOTHING;

-- Link all existing data to default company
DO $$
DECLARE
  default_company_id UUID;
BEGIN
  SELECT id INTO default_company_id FROM public.companies WHERE slug = 'empresa-padrao' LIMIT 1;
  
  IF default_company_id IS NOT NULL THEN
    UPDATE public.clients SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE public.quotes SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE public.active_orders SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE public.financial_transactions SET company_id = default_company_id WHERE company_id IS NULL;
    UPDATE public.supplies SET company_id = default_company_id WHERE company_id IS NULL;
  END IF;
END $$;

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own roles"
ON public.user_roles
FOR SELECT
USING (user_id = auth.uid() OR has_role(auth.uid(), 'superadmin') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Superadmins can manage all roles"
ON public.user_roles
FOR ALL
USING (has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Admins can manage roles in their company"
ON public.user_roles
FOR ALL
USING (
  has_role(auth.uid(), 'admin') AND
  EXISTS (
    SELECT 1 FROM public.user_companies uc1
    JOIN public.user_companies uc2 ON uc1.company_id = uc2.company_id
    WHERE uc1.user_id = auth.uid() AND uc2.user_id = user_roles.user_id
  )
);

-- Update companies RLS policies
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;

CREATE POLICY "Superadmins can manage all companies"
ON public.companies
FOR ALL
USING (has_role(auth.uid(), 'superadmin'));

CREATE POLICY "Users can view their own company"
ON public.companies
FOR SELECT
USING (id = get_user_company_id(auth.uid()));

-- Update financial_transactions RLS to exclude non-admin users
DROP POLICY IF EXISTS "Users can manage their company transactions" ON public.financial_transactions;

CREATE POLICY "Admins and superadmins can manage their company transactions"
ON public.financial_transactions
FOR ALL
USING (
  company_id = get_user_company_id(auth.uid()) AND
  (has_role(auth.uid(), 'superadmin') OR has_role(auth.uid(), 'admin'))
);

CREATE POLICY "Users can view their company transactions"
ON public.financial_transactions
FOR SELECT
USING (
  company_id = get_user_company_id(auth.uid()) AND
  NOT has_role(auth.uid(), 'user')
);