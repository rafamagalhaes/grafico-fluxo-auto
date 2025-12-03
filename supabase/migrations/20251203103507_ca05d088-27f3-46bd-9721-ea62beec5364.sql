-- Update plans table with Asaas pricing
-- Clear existing plans and add new ones with card and PIX pricing

DELETE FROM plans;

INSERT INTO plans (name, duration_months, price) VALUES
  ('Mensal - Cartão', 1, 39.99),
  ('Mensal - PIX', 1, 37.99),
  ('Anual - Cartão', 12, 383.90),
  ('Anual - PIX', 12, 364.71);

-- Add payment_method column to subscriptions if not exists
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'credit_card';

-- Add asaas_subscription_id to track Asaas subscription
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS asaas_subscription_id text;

-- Add asaas_customer_id to companies to track Asaas customer
ALTER TABLE companies ADD COLUMN IF NOT EXISTS asaas_customer_id text;