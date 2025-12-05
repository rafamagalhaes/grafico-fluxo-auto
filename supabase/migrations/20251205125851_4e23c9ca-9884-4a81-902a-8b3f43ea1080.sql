-- Create a secure view with only the columns needed for login
CREATE VIEW public.companies_login AS
SELECT id, name, slug FROM public.companies;

-- Grant SELECT on the view to anon and authenticated roles
GRANT SELECT ON public.companies_login TO anon;
GRANT SELECT ON public.companies_login TO authenticated;

-- Remove the overly permissive "Anyone can view companies for login" policy
DROP POLICY IF EXISTS "Anyone can view companies for login" ON public.companies;