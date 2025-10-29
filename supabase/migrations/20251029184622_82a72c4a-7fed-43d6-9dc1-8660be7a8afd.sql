-- Function to generate automatic code for clients
CREATE OR REPLACE FUNCTION generate_client_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL THEN
    NEW.code := 'CLI-' || LPAD(NEXTVAL('clients_code_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for clients
CREATE SEQUENCE IF NOT EXISTS clients_code_seq START WITH 1;

-- Create trigger for clients
DROP TRIGGER IF EXISTS set_client_code ON public.clients;
CREATE TRIGGER set_client_code
  BEFORE INSERT ON public.clients
  FOR EACH ROW
  EXECUTE FUNCTION generate_client_code();

-- Function to generate automatic code for quotes
CREATE OR REPLACE FUNCTION generate_quote_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL THEN
    NEW.code := 'ORC-' || LPAD(NEXTVAL('quotes_code_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for quotes
CREATE SEQUENCE IF NOT EXISTS quotes_code_seq START WITH 1;

-- Create trigger for quotes
DROP TRIGGER IF EXISTS set_quote_code ON public.quotes;
CREATE TRIGGER set_quote_code
  BEFORE INSERT ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION generate_quote_code();

-- Function to generate automatic code for orders
CREATE OR REPLACE FUNCTION generate_order_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL THEN
    NEW.code := 'PED-' || LPAD(NEXTVAL('orders_code_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for orders
CREATE SEQUENCE IF NOT EXISTS orders_code_seq START WITH 1;

-- Create trigger for orders
DROP TRIGGER IF EXISTS set_order_code ON public.active_orders;
CREATE TRIGGER set_order_code
  BEFORE INSERT ON public.active_orders
  FOR EACH ROW
  EXECUTE FUNCTION generate_order_code();

-- Function to generate automatic code for supplies
CREATE OR REPLACE FUNCTION generate_supply_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.code IS NULL THEN
    NEW.code := 'INS-' || LPAD(NEXTVAL('supplies_code_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create sequence for supplies
CREATE SEQUENCE IF NOT EXISTS supplies_code_seq START WITH 1;

-- Create trigger for supplies
DROP TRIGGER IF EXISTS set_supply_code ON public.supplies;
CREATE TRIGGER set_supply_code
  BEFORE INSERT ON public.supplies
  FOR EACH ROW
  EXECUTE FUNCTION generate_supply_code();