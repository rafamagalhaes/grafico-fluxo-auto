-- Allow unauthenticated users to view companies list for login page
CREATE POLICY "Anyone can view companies for login"
ON public.companies
FOR SELECT
TO anon
USING (true);