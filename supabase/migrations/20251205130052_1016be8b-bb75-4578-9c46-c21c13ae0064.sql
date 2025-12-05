-- Drop the view since we'll use a function instead
DROP VIEW IF EXISTS public.companies_login;

-- Create a security definer function that only returns safe columns
CREATE OR REPLACE FUNCTION public.get_companies_for_login()
RETURNS TABLE (id uuid, name text, slug text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.id, c.name, c.slug FROM public.companies c ORDER BY c.name;
$$;

-- Grant execute to anon and authenticated
GRANT EXECUTE ON FUNCTION public.get_companies_for_login() TO anon;
GRANT EXECUTE ON FUNCTION public.get_companies_for_login() TO authenticated;