-- Fix security issue: Set search_path for all code generation functions

-- Function to generate automatic code for clients
CREATE OR REPLACE FUNCTION generate_client_code()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.code IS NULL THEN
    NEW.code := 'CLI-' || LPAD(NEXTVAL('clients_code_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Function to generate automatic code for quotes
CREATE OR REPLACE FUNCTION generate_quote_code()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.code IS NULL THEN
    NEW.code := 'ORC-' || LPAD(NEXTVAL('quotes_code_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Function to generate automatic code for orders
CREATE OR REPLACE FUNCTION generate_order_code()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.code IS NULL THEN
    NEW.code := 'PED-' || LPAD(NEXTVAL('orders_code_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Function to generate automatic code for supplies
CREATE OR REPLACE FUNCTION generate_supply_code()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.code IS NULL THEN
    NEW.code := 'INS-' || LPAD(NEXTVAL('supplies_code_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;