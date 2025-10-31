-- Drop all existing public access policies
DROP POLICY IF EXISTS "Allow public access to clients" ON clients;
DROP POLICY IF EXISTS "Allow public access to quotes" ON quotes;
DROP POLICY IF EXISTS "Allow public access to active_orders" ON active_orders;
DROP POLICY IF EXISTS "Allow public access to financial_transactions" ON financial_transactions;
DROP POLICY IF EXISTS "Allow public access to supplies" ON supplies;
DROP POLICY IF EXISTS "Allow public access to quote_supplies" ON quote_supplies;

-- Create authenticated-only policies for clients table
CREATE POLICY "Authenticated users can manage clients"
ON clients
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Create authenticated-only policies for quotes table
CREATE POLICY "Authenticated users can manage quotes"
ON quotes
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Create authenticated-only policies for active_orders table
CREATE POLICY "Authenticated users can manage orders"
ON active_orders
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Create authenticated-only policies for financial_transactions table
CREATE POLICY "Authenticated users can manage transactions"
ON financial_transactions
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Create authenticated-only policies for supplies table
CREATE POLICY "Authenticated users can manage supplies"
ON supplies
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);

-- Create authenticated-only policies for quote_supplies table
CREATE POLICY "Authenticated users can manage quote_supplies"
ON quote_supplies
FOR ALL
USING (auth.uid() IS NOT NULL)
WITH CHECK (auth.uid() IS NOT NULL);