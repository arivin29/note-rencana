-- Migration: Add contact fields to owners table
-- Date: 2025-11-23
-- Description: Add email, phone, and address columns to owners table

-- ============================================
-- ADD NEW COLUMNS
-- ============================================

-- Add email column
ALTER TABLE owners 
ADD COLUMN IF NOT EXISTS email TEXT NULL;

-- Add phone column
ALTER TABLE owners 
ADD COLUMN IF NOT EXISTS phone TEXT NULL;

-- Add address column
ALTER TABLE owners 
ADD COLUMN IF NOT EXISTS address TEXT NULL;

-- ============================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================

COMMENT ON COLUMN owners.email IS 'Owner email address for contact';
COMMENT ON COLUMN owners.phone IS 'Owner phone number for contact';
COMMENT ON COLUMN owners.address IS 'Owner physical address';

-- ============================================
-- OPTIONAL: CREATE INDEX FOR EMAIL SEARCH
-- ============================================

CREATE INDEX IF NOT EXISTS idx_owners_email ON owners(email);

-- ============================================
-- VERIFY COLUMNS
-- ============================================

-- Check if columns exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'owners' 
        AND column_name IN ('email', 'phone', 'address')
    ) THEN
        RAISE NOTICE 'Migration completed successfully! Columns email, phone, address added to owners table.';
    ELSE
        RAISE EXCEPTION 'Migration failed! Columns not found.';
    END IF;
END $$;

-- ============================================
-- ROLLBACK SCRIPT (if needed)
-- ============================================
-- To rollback this migration, run:
/*
ALTER TABLE owners DROP COLUMN IF EXISTS email;
ALTER TABLE owners DROP COLUMN IF EXISTS phone;
ALTER TABLE owners DROP COLUMN IF EXISTS address;
DROP INDEX IF EXISTS idx_owners_email;
*/
