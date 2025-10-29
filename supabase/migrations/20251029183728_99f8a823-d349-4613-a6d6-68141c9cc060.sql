-- Create supplies table for managing materials/supplies
CREATE TABLE public.supplies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT,
  name TEXT NOT NULL,
  cost_value NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.supplies ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
CREATE POLICY "Allow public access to supplies"
ON public.supplies
FOR ALL
USING (true)
WITH CHECK (true);

-- Create quote_supplies junction table to link quotes with supplies
CREATE TABLE public.quote_supplies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  supply_id UUID NOT NULL REFERENCES public.supplies(id) ON DELETE CASCADE,
  quantity NUMERIC NOT NULL DEFAULT 1,
  adjusted_cost NUMERIC, -- allows cost adjustment per quote
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.quote_supplies ENABLE ROW LEVEL SECURITY;

-- Create policy for public access
CREATE POLICY "Allow public access to quote_supplies"
ON public.quote_supplies
FOR ALL
USING (true)
WITH CHECK (true);

-- Create trigger for automatic timestamp updates on supplies
CREATE TRIGGER update_supplies_updated_at
BEFORE UPDATE ON public.supplies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_quote_supplies_quote_id ON public.quote_supplies(quote_id);
CREATE INDEX idx_quote_supplies_supply_id ON public.quote_supplies(supply_id);