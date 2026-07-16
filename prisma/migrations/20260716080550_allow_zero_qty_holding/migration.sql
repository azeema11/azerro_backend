-- Allow zero quantity for holdings
ALTER TABLE "Holding" DROP CONSTRAINT IF EXISTS "check_quantity_positive";
ALTER TABLE "Holding" ADD CONSTRAINT "check_quantity_non_negative" CHECK (quantity >= 0);