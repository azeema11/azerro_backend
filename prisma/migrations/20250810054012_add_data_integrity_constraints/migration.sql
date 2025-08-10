-- Add positivity constraints for financial values
ALTER TABLE "CurrencyRate" ADD CONSTRAINT "check_rate_positive" CHECK (rate > 0);
ALTER TABLE "CurrencyRateHistory" ADD CONSTRAINT "check_rate_positive" CHECK (rate > 0);

-- Add positivity constraints for monetary amounts where applicable
ALTER TABLE "Transaction" ADD CONSTRAINT "check_amount_positive" CHECK (amount > 0);
ALTER TABLE "BankAccount" ADD CONSTRAINT "check_balance_valid" CHECK (balance >= 0 OR type = 'CREDIT_CARD');
ALTER TABLE "Budget" ADD CONSTRAINT "check_budget_amount_positive" CHECK (amount > 0);
ALTER TABLE "Goal" ADD CONSTRAINT "check_target_amount_positive" CHECK ("targetAmount" > 0);
ALTER TABLE "Goal" ADD CONSTRAINT "check_saved_amount_valid" CHECK ("savedAmount" >= 0);
ALTER TABLE "PlannedEvent" ADD CONSTRAINT "check_estimated_cost_positive" CHECK ("estimatedCost" > 0);
ALTER TABLE "PlannedEvent" ADD CONSTRAINT "check_saved_so_far_valid" CHECK ("savedSoFar" >= 0);
ALTER TABLE "Holding" ADD CONSTRAINT "check_quantity_positive" CHECK (quantity > 0);
ALTER TABLE "Holding" ADD CONSTRAINT "check_avg_cost_positive" CHECK ("avgCost" > 0);
ALTER TABLE "Holding" ADD CONSTRAINT "check_last_price_valid" CHECK ("lastPrice" >= 0);
ALTER TABLE "Holding" ADD CONSTRAINT "check_converted_value_valid" CHECK ("convertedValue" >= 0);
ALTER TABLE "User" ADD CONSTRAINT "check_monthly_income_valid" CHECK ("monthlyIncome" IS NULL OR "monthlyIncome" >= 0);

-- Add currency code format constraints (3-character uppercase codes)
ALTER TABLE "CurrencyRate" ADD CONSTRAINT "check_base_currency_format" CHECK (base ~ '^[A-Z]{3}$');
ALTER TABLE "CurrencyRate" ADD CONSTRAINT "check_target_currency_format" CHECK (target ~ '^[A-Z]{3}$');
ALTER TABLE "CurrencyRateHistory" ADD CONSTRAINT "check_base_currency_format" CHECK (base ~ '^[A-Z]{3}$');
ALTER TABLE "CurrencyRateHistory" ADD CONSTRAINT "check_target_currency_format" CHECK (target ~ '^[A-Z]{3}$');
ALTER TABLE "User" ADD CONSTRAINT "check_base_currency_format" CHECK ("baseCurrency" ~ '^[A-Z]{3}$');
ALTER TABLE "Transaction" ADD CONSTRAINT "check_currency_format" CHECK (currency ~ '^[A-Z]{3}$');
ALTER TABLE "BankAccount" ADD CONSTRAINT "check_currency_format" CHECK (currency ~ '^[A-Z]{3}$');
ALTER TABLE "PlannedEvent" ADD CONSTRAINT "check_currency_format" CHECK (currency ~ '^[A-Z]{3}$');
ALTER TABLE "Goal" ADD CONSTRAINT "check_currency_format" CHECK (currency ~ '^[A-Z]{3}$');
ALTER TABLE "Holding" ADD CONSTRAINT "check_holding_currency_format" CHECK ("holdingCurrency" ~ '^[A-Z]{3}$');

-- Add email format constraint
ALTER TABLE "User" ADD CONSTRAINT "check_email_format" CHECK (email ~ '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$');

-- Add logical business constraints
ALTER TABLE "Goal" ADD CONSTRAINT "check_target_date_future" CHECK ("targetDate" > "createdAt");
ALTER TABLE "PlannedEvent" ADD CONSTRAINT "check_target_date_future" CHECK ("targetDate" > "createdAt");

-- Prevent self-referencing currency rates
ALTER TABLE "CurrencyRate" ADD CONSTRAINT "check_different_currencies" CHECK (base != target);
ALTER TABLE "CurrencyRateHistory" ADD CONSTRAINT "check_different_currencies" CHECK (base != target);
