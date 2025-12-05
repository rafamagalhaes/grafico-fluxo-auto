-- Fix the view to use security invoker instead of definer
DROP VIEW IF EXISTS public.companies_login;

CREATE VIEW public.companies_login 
WITH (security_invoker = true)
AS SELECT id, name, slug FROM public.companies;

-- Grant SELECT on the view to anon and authenticated roles
GRANT SELECT ON public.companies_login TO anon;
GRANT SELECT ON public.companies_login TO authenticated;