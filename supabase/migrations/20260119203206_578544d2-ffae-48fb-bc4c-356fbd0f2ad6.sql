-- Add nome_fantasia and descricao to leads table
ALTER TABLE public.leads 
ADD COLUMN nome_fantasia text,
ADD COLUMN descricao text;

-- Add nome_fantasia to clients table
ALTER TABLE public.clients 
ADD COLUMN nome_fantasia text;