-- Update default trial period from 15 to 30 days
ALTER TABLE public.companies 
ALTER COLUMN trial_end_date SET DEFAULT (now() + interval '30 days');