-- Add client_type and cnpj columns to customers table
ALTER TABLE public.customers 
ADD COLUMN client_type text CHECK (client_type IN ('fisica', 'juridica')),
ADD COLUMN cnpj text;

-- Add comment for clarity
COMMENT ON COLUMN public.customers.client_type IS 'Type of customer: fisica (individual) or juridica (company)';
COMMENT ON COLUMN public.customers.cnpj IS 'CNPJ number for juridica customers';