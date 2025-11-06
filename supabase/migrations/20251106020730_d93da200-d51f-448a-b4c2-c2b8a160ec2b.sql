-- Create table for quote products
CREATE TABLE public.quote_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL,
  product_name TEXT NOT NULL,
  sale_value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.quote_products ENABLE ROW LEVEL SECURITY;

-- Create policy for managing quote products
CREATE POLICY "Users can manage their company quote products"
ON public.quote_products
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.quotes
    WHERE quotes.id = quote_products.quote_id
    AND quotes.company_id = get_user_company_id(auth.uid())
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.quotes
    WHERE quotes.id = quote_products.quote_id
    AND quotes.company_id = get_user_company_id(auth.uid())
  )
);