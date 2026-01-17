-- Create leads table
CREATE TABLE public.leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id),
  owner_id UUID NOT NULL,
  cnpj TEXT,
  razao_social TEXT NOT NULL,
  endereco TEXT,
  cargo TEXT,
  first_contact_date DATE,
  second_contact_date DATE,
  funnel_stage TEXT NOT NULL DEFAULT 'novo' CHECK (funnel_stage IN ('novo', 'qualificado', 'em_negociacao', 'descartado')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create lead_contacts table
CREATE TABLE public.lead_contacts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  whatsapp TEXT,
  email TEXT,
  position TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_contacts ENABLE ROW LEVEL SECURITY;

-- RLS policies for leads
CREATE POLICY "Users can manage their company leads"
ON public.leads
FOR ALL
USING (company_id = get_user_company_id(auth.uid()))
WITH CHECK (company_id = get_user_company_id(auth.uid()));

-- RLS policies for lead_contacts
CREATE POLICY "Users can manage their company lead contacts"
ON public.lead_contacts
FOR ALL
USING (EXISTS (
  SELECT 1 FROM leads
  WHERE leads.id = lead_contacts.lead_id
  AND leads.company_id = get_user_company_id(auth.uid())
))
WITH CHECK (EXISTS (
  SELECT 1 FROM leads
  WHERE leads.id = lead_contacts.lead_id
  AND leads.company_id = get_user_company_id(auth.uid())
));

-- Create sequence for lead codes
CREATE SEQUENCE IF NOT EXISTS leads_code_seq START 1;

-- Create function to generate lead code
CREATE OR REPLACE FUNCTION public.generate_lead_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.code IS NULL THEN
    NEW.code := 'LEAD-' || LPAD(NEXTVAL('leads_code_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Add code column to leads
ALTER TABLE public.leads ADD COLUMN code TEXT;

-- Create trigger for lead code generation
CREATE TRIGGER generate_lead_code_trigger
BEFORE INSERT ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.generate_lead_code();

-- Create trigger for updated_at on leads
CREATE TRIGGER update_leads_updated_at
BEFORE UPDATE ON public.leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on lead_contacts
CREATE TRIGGER update_lead_contacts_updated_at
BEFORE UPDATE ON public.lead_contacts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();