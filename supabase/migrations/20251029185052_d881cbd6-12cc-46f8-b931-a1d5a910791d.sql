-- Make code columns nullable to allow auto-generation by triggers
-- The triggers will fill these values immediately, so they'll never actually be null in practice

ALTER TABLE public.clients ALTER COLUMN code DROP NOT NULL;
ALTER TABLE public.quotes ALTER COLUMN code DROP NOT NULL;
ALTER TABLE public.active_orders ALTER COLUMN code DROP NOT NULL;
ALTER TABLE public.supplies ALTER COLUMN code DROP NOT NULL;