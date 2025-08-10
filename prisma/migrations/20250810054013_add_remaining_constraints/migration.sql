-- Add positivity constraints for financial values (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_rate_positive' AND conrelid = to_regclass('"CurrencyRate"')) THEN
        ALTER TABLE "CurrencyRate" ADD CONSTRAINT "check_rate_positive" CHECK (rate > 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_rate_positive_history' AND conrelid = to_regclass('"CurrencyRateHistory"')) THEN
        ALTER TABLE "CurrencyRateHistory" ADD CONSTRAINT "check_rate_positive_history" CHECK (rate > 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_amount_positive' AND conrelid = to_regclass('"Transaction"')) THEN
        ALTER TABLE "Transaction" ADD CONSTRAINT "check_amount_positive" CHECK (amount > 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_budget_amount_positive' AND conrelid = to_regclass('"Budget"')) THEN
        ALTER TABLE "Budget" ADD CONSTRAINT "check_budget_amount_positive" CHECK (amount > 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_target_amount_positive' AND conrelid = to_regclass('"Goal"')) THEN
        ALTER TABLE "Goal" ADD CONSTRAINT "check_target_amount_positive" CHECK ("targetAmount" > 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_saved_amount_valid' AND conrelid = to_regclass('"Goal"')) THEN
        ALTER TABLE "Goal" ADD CONSTRAINT "check_saved_amount_valid" CHECK ("savedAmount" >= 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_estimated_cost_positive' AND conrelid = to_regclass('"PlannedEvent"')) THEN
        ALTER TABLE "PlannedEvent" ADD CONSTRAINT "check_estimated_cost_positive" CHECK ("estimatedCost" > 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_saved_so_far_valid' AND conrelid = to_regclass('"PlannedEvent"')) THEN
        ALTER TABLE "PlannedEvent" ADD CONSTRAINT "check_saved_so_far_valid" CHECK ("savedSoFar" >= 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_quantity_positive' AND conrelid = to_regclass('"Holding"')) THEN
        ALTER TABLE "Holding" ADD CONSTRAINT "check_quantity_positive" CHECK (quantity > 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_avg_cost_positive' AND conrelid = to_regclass('"Holding"')) THEN
        ALTER TABLE "Holding" ADD CONSTRAINT "check_avg_cost_positive" CHECK ("avgCost" > 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_last_price_valid' AND conrelid = to_regclass('"Holding"')) THEN
        ALTER TABLE "Holding" ADD CONSTRAINT "check_last_price_valid" CHECK ("lastPrice" >= 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_converted_value_valid' AND conrelid = to_regclass('"Holding"')) THEN
        ALTER TABLE "Holding" ADD CONSTRAINT "check_converted_value_valid" CHECK ("convertedValue" >= 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_monthly_income_valid' AND conrelid = to_regclass('"User"')) THEN
        ALTER TABLE "User" ADD CONSTRAINT "check_monthly_income_valid" CHECK ("monthlyIncome" IS NULL OR "monthlyIncome" >= 0);
    END IF;
    
    -- Prevent self-referencing currency rates
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_different_currencies' AND conrelid = to_regclass('"CurrencyRate"')) THEN
        ALTER TABLE "CurrencyRate" ADD CONSTRAINT "check_different_currencies" CHECK (base != target);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'check_different_currencies_history' AND conrelid = to_regclass('"CurrencyRateHistory"')) THEN
        ALTER TABLE "CurrencyRateHistory" ADD CONSTRAINT "check_different_currencies_history" CHECK (base != target);
    END IF;
END $$;
