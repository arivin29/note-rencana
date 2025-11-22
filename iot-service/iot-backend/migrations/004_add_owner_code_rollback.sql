-- Rollback Migration: Remove owner code column and related functions/triggers
-- Description: Rollback the addition of code column from owners table

-- Step 1: Drop trigger
DROP TRIGGER IF EXISTS trigger_auto_generate_owner_code ON public.owners;

-- Step 2: Drop trigger function
DROP FUNCTION IF EXISTS auto_generate_owner_code();

-- Step 3: Drop code generation function
DROP FUNCTION IF EXISTS generate_unique_owner_code();

-- Step 4: Remove code column
ALTER TABLE public.owners
DROP COLUMN IF EXISTS code;
