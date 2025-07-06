-- Update payments table to support PayPal instead of Stripe
ALTER TABLE public.payments 
DROP COLUMN stripe_payment_intent_id,
ADD COLUMN paypal_order_id TEXT,
ADD COLUMN paypal_payment_id TEXT;