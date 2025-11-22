-- Migration: Add owner_code column with auto-generation
-- Date: 2025-11-23
-- Description: Add unique 5-digit owner code for each owner

-- ============================================
-- ADD OWNER_CODE COLUMN
-- ============================================

-- Add owner_code column (will be populated by application)
ALTER TABLE owners 
ADD COLUMN IF NOT EXISTS owner_code VARCHAR(5) NULL;

-- ============================================
-- ADD UNIQUE CONSTRAINT
-- ============================================

-- Add unique constraint
ALTER TABLE owners 
ADD CONSTRAINT IF NOT EXISTS unique_owner_code UNIQUE (owner_code);

-- ============================================
-- CREATE INDEX
-- ============================================

CREATE INDEX IF NOT EXISTS idx_owners_owner_code ON owners(owner_code);

-- ============================================
-- ADD COMMENT
-- ============================================

COMMENT ON COLUMN owners.owner_code IS 'Unique 5-digit owner identification code (auto-generated)';

-- ============================================
-- GENERATE CODES FOR EXISTING OWNERS
-- ============================================

-- Generate unique 5-digit codes for existing owners without code
DO $$
DECLARE
    owner_record RECORD;
    new_code VARCHAR(5);
    code_exists BOOLEAN;
    attempt INT;
BEGIN
    FOR owner_record IN 
        SELECT id_owner 
        FROM owners 
        WHERE owner_code IS NULL
    LOOP
        attempt := 0;
        code_exists := TRUE;
        
        -- Try to generate unique code (max 100 attempts)
        WHILE code_exists AND attempt < 100 LOOP
            -- Generate random 5-digit alphanumeric code (uppercase)
            new_code := UPPER(
                SUBSTRING(MD5(random()::text || clock_timestamp()::text) FROM 1 FOR 5)
            );
            
            -- Check if code already exists
            SELECT EXISTS(
                SELECT 1 FROM owners WHERE owner_code = new_code
            ) INTO code_exists;
            
            attempt := attempt + 1;
        END LOOP;
        
        -- Update owner with generated code
        IF NOT code_exists THEN
            UPDATE owners 
            SET owner_code = new_code 
            WHERE id_owner = owner_record.id_owner;
            
            RAISE NOTICE 'Generated code % for owner %', new_code, owner_record.id_owner;
        ELSE
            RAISE WARNING 'Failed to generate unique code for owner % after % attempts', owner_record.id_owner, attempt;
        END IF;
    END LOOP;
END $$;

-- ============================================
-- MAKE COLUMN NOT NULL (after populating existing data)
-- ============================================

-- Now make it NOT NULL
ALTER TABLE owners 
ALTER COLUMN owner_code SET NOT NULL;

-- ============================================
-- VERIFY
-- ============================================

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'owners' 
        AND column_name = 'owner_code'
    ) THEN
        RAISE NOTICE 'Migration completed successfully! Column owner_code added with unique constraint.';
    ELSE
        RAISE EXCEPTION 'Migration failed! Column owner_code not found.';
    END IF;
END $$;

-- ============================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================
-- To rollback this migration, run:
/*
ALTER TABLE owners DROP CONSTRAINT IF EXISTS unique_owner_code;
DROP INDEX IF EXISTS idx_owners_owner_code;
ALTER TABLE owners DROP COLUMN IF EXISTS owner_code;
*/
