-- Database Size Optimization Migration
-- Safely drops indexes on empty tables to reduce storage overhead
-- These indexes will be automatically recreated by Prisma when tables get data

-- First, check if tables are empty before dropping indexes
DO $$
DECLARE
    goal_count INTEGER;
    holding_count INTEGER;
    planned_event_count INTEGER;
    budget_count INTEGER;
    assistant_count INTEGER;
    user_assistant_count INTEGER;
BEGIN
    -- Get row counts for each table
    SELECT COUNT(*) INTO goal_count FROM "Goal";
    SELECT COUNT(*) INTO holding_count FROM "Holding";
    SELECT COUNT(*) INTO planned_event_count FROM "PlannedEvent";
    SELECT COUNT(*) INTO budget_count FROM "Budget";
    SELECT COUNT(*) INTO assistant_count FROM "Assistant";
    SELECT COUNT(*) INTO user_assistant_count FROM "UserAssistant";
    
    RAISE NOTICE 'Table row counts - Goal: %, Holding: %, PlannedEvent: %, Budget: %, Assistant: %, UserAssistant: %', 
        goal_count, holding_count, planned_event_count, budget_count, assistant_count, user_assistant_count;
    
    -- Drop Goal table indexes if empty
    IF goal_count = 0 THEN
        RAISE NOTICE 'Dropping Goal table indexes (table is empty)';
        DROP INDEX IF EXISTS "Goal_userId_idx";
        DROP INDEX IF EXISTS "Goal_userId_completed_idx";
        DROP INDEX IF EXISTS "Goal_userId_targetDate_idx";
        DROP INDEX IF EXISTS "Goal_targetDate_idx";
        DROP INDEX IF EXISTS "Goal_id_userId_key";
        -- Keep primary key for referential integrity
    END IF;
    
    -- Drop Holding table indexes if empty
    IF holding_count = 0 THEN
        RAISE NOTICE 'Dropping Holding table indexes (table is empty)';
        DROP INDEX IF EXISTS "Holding_userId_idx";
        DROP INDEX IF EXISTS "Holding_userId_assetType_idx";
        DROP INDEX IF EXISTS "Holding_ticker_idx";
        DROP INDEX IF EXISTS "Holding_platform_idx";
        DROP INDEX IF EXISTS "Holding_id_userId_key";
        -- Keep primary key
    END IF;
    
    -- Drop PlannedEvent table indexes if empty
    IF planned_event_count = 0 THEN
        RAISE NOTICE 'Dropping PlannedEvent table indexes (table is empty)';
        DROP INDEX IF EXISTS "PlannedEvent_userId_completed_idx";
        DROP INDEX IF EXISTS "PlannedEvent_userId_targetDate_idx";
        DROP INDEX IF EXISTS "PlannedEvent_userId_category_idx";
        DROP INDEX IF EXISTS "PlannedEvent_targetDate_idx";
        DROP INDEX IF EXISTS "PlannedEvent_id_userId_key";
        DROP INDEX IF EXISTS "PlannedEvent_completedTxId_key";
        -- Keep primary key
    END IF;
    
    -- Drop Budget table indexes if empty
    IF budget_count = 0 THEN
        RAISE NOTICE 'Dropping Budget table indexes (table is empty)';
        DROP INDEX IF EXISTS "Budget_userId_idx";
        DROP INDEX IF EXISTS "Budget_userId_category_idx";
        DROP INDEX IF EXISTS "Budget_userId_period_idx";
        DROP INDEX IF EXISTS "Budget_id_userId_key";
        -- Keep primary key
    END IF;
    
    -- Drop Assistant system indexes if empty
    IF assistant_count = 0 THEN
        RAISE NOTICE 'Dropping Assistant table indexes (table is empty)';
        DROP INDEX IF EXISTS "Assistant_name_key";
        -- Keep primary key
    END IF;
    
    IF user_assistant_count = 0 THEN
        RAISE NOTICE 'Dropping UserAssistant table indexes (table is empty)';
        DROP INDEX IF EXISTS "UserAssistant_userId_assistantId_key";
        -- Keep primary key
    END IF;
    
    RAISE NOTICE 'Index optimization complete - indexes dropped only on empty tables';
    RAISE NOTICE 'Note: Prisma will automatically recreate these indexes when tables receive data';
    
END $$;
