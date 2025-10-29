-- Create clients table
CREATE TABLE IF NOT EXISTS public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  birth_date DATE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create quotes table (Pedidos em orçamento)
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
  description TEXT NOT NULL,
  delivery_date DATE NOT NULL,
  cost_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
  sale_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
  profit_value DECIMAL(10, 2) GENERATED ALWAYS AS (sale_value - cost_value) STORED,
  approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create active_orders table (Pedidos em andamento)
CREATE TABLE IF NOT EXISTS public.active_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id UUID REFERENCES public.quotes(id) ON DELETE CASCADE,
  code TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  delivery_date DATE NOT NULL,
  has_advance BOOLEAN DEFAULT false,
  advance_value DECIMAL(10, 2) DEFAULT 0,
  total_value DECIMAL(10, 2) NOT NULL DEFAULT 0,
  pending_value DECIMAL(10, 2) GENERATED ALWAYS AS (total_value - COALESCE(advance_value, 0)) STORED,
  status TEXT DEFAULT 'em_andamento' CHECK (status IN ('em_andamento', 'concluido', 'cancelado')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create financial_transactions table (Controle Financeiro)
CREATE TABLE IF NOT EXISTS public.financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('receita', 'despesa')),
  description TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  due_date DATE NOT NULL,
  paid BOOLEAN DEFAULT false,
  paid_date DATE,
  category TEXT,
  order_id UUID REFERENCES public.active_orders(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.active_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_transactions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (public access for now - can be restricted later)
CREATE POLICY "Allow public access to clients" ON public.clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to quotes" ON public.quotes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to active_orders" ON public.active_orders FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public access to financial_transactions" ON public.financial_transactions FOR ALL USING (true) WITH CHECK (true);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_clients_updated_at BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quotes_updated_at BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_active_orders_updated_at BEFORE UPDATE ON public.active_orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_financial_transactions_updated_at BEFORE UPDATE ON public.financial_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_clients_code ON public.clients(code);
CREATE INDEX idx_quotes_client_id ON public.quotes(client_id);
CREATE INDEX idx_quotes_code ON public.quotes(code);
CREATE INDEX idx_active_orders_code ON public.active_orders(code);
CREATE INDEX idx_financial_transactions_type ON public.financial_transactions(type);
CREATE INDEX idx_financial_transactions_due_date ON public.financial_transactions(due_date);