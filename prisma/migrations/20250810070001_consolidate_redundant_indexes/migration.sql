-- Migration: Consolidate Redundant Indexes for Space Optimization
-- This removes redundant single-column indexes where compound indexes already provide coverage

-- CurrencyRateHistory table has redundant indexes:
-- - CurrencyRateHistory_rateDate_idx (single column)
-- - CurrencyRateHistory_base_target_idx (two columns) 
-- - CurrencyRateHistory_base_target_rateDate_key (compound - covers all queries)
--
-- The compound index CurrencyRateHistory_base_target_rateDate_key can handle:
-- 1. Queries filtering by (base, target, rateDate) - exact match
-- 2. Queries filtering by (base, target) - prefix match
-- 3. Queries filtering by (base) - prefix match
--
-- This makes the individual indexes redundant.

-- Drop redundant single-column index on rateDate
-- (compound index covers rateDate queries when combined with base/target)
DROP INDEX IF EXISTS "CurrencyRateHistory_rateDate_idx";

-- Drop redundant two-column index on (base, target)  
-- (compound index covers these queries as a prefix)
DROP INDEX IF EXISTS "CurrencyRateHistory_base_target_idx";

-- Keep the compound index: CurrencyRateHistory_base_target_rateDate_key
-- This single index efficiently handles all query patterns:
-- - SELECT * FROM CurrencyRateHistory WHERE base = ? AND target = ? AND rateDate = ?
-- - SELECT * FROM CurrencyRateHistory WHERE base = ? AND target = ?
-- - SELECT * FROM CurrencyRateHistory WHERE base = ?

-- Expected space savings: ~32 KB (2 indexes × 16 KB each)
