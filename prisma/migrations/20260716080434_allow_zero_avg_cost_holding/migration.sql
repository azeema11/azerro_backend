-- Allow zero avg cost for holdings
ALTER TABLE "Holding" DROP CONSTRAINT IF EXISTS "check_avg_cost_positive";
ALTER TABLE "Holding" ADD CONSTRAINT "check_avg_cost_non_negative" CHECK ("avgCost" >= 0);