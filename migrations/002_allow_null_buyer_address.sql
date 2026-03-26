-- Allow sell records without buyer_address
ALTER TABLE purchases
  ALTER COLUMN buyer_address DROP NOT NULL;
