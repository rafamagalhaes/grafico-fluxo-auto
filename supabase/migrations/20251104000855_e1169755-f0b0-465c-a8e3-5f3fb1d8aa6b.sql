-- Add unlimited_access column to companies table
ALTER TABLE public.companies 
ADD COLUMN unlimited_access boolean DEFAULT false;

-- Create index for better performance
CREATE INDEX idx_companies_unlimited_access ON public.companies(unlimited_access);

COMMENT ON COLUMN public.companies.unlimited_access IS 'Grants unlimited access to the company, bypassing subscription requirements';