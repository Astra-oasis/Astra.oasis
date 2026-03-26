-- Allow fractional quantities in purchases
ALTER TABLE purchases
  ALTER COLUMN quantity TYPE NUMERIC(36, 18)
  USING quantity::numeric;
