-- Add trial_end_date to companies
ALTER TABLE public.companies 
ADD COLUMN trial_end_date timestamp with time zone DEFAULT (now() + interval '15 days');

-- Create plans table
CREATE TABLE public.plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  duration_months integer NOT NULL,
  price numeric NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  plan_id uuid NOT NULL REFERENCES public.plans(id),
  start_date timestamp with time zone NOT NULL DEFAULT now(),
  end_date timestamp with time zone NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'trial')),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS policies for plans (public read)
CREATE POLICY "Everyone can view plans"
ON public.plans
FOR SELECT
USING (true);

-- RLS policies for subscriptions
CREATE POLICY "Users can view their company subscriptions"
ON public.subscriptions
FOR SELECT
USING (company_id = get_user_company_id(auth.uid()));

CREATE POLICY "Superadmins can manage all subscriptions"
ON public.subscriptions
FOR ALL
USING (has_role(auth.uid(), 'superadmin'::app_role));

CREATE POLICY "Admins can manage their company subscriptions"
ON public.subscriptions
FOR ALL
USING (
  company_id = get_user_company_id(auth.uid()) 
  AND has_role(auth.uid(), 'admin'::app_role)
);

-- Insert default plans
INSERT INTO public.plans (name, duration_months, price) VALUES
  ('Mensal', 1, 99.90),
  ('Trimestral', 3, 269.70),
  ('Semestral', 6, 509.40),
  ('Anual', 12, 959.40);

-- Add trigger for subscriptions updated_at
CREATE TRIGGER update_subscriptions_updated_at
BEFORE UPDATE ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();