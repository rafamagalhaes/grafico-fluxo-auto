-- Add client type and document fields
ALTER TABLE public.clients 
ADD COLUMN client_type text DEFAULT 'fisica' CHECK (client_type IN ('fisica', 'juridica')),
ADD COLUMN cnpj text;