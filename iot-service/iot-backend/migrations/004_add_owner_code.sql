-- Migration: Add owner code column with auto-generation
-- Description: Add a unique 5-digit code column to owners table with automatic generation on insert

-- Step 1: Add code column to owners table
ALTER TABLE public.owners
ADD COLUMN code VARCHAR(5) UNIQUE;

-- Step 2: Create function to generate unique 5-digit owner code
CREATE OR REPLACE FUNCTION generate_unique_owner_code()
RETURNS VARCHAR(5) AS $$
DECLARE
    new_code VARCHAR(5);
    code_exists BOOLEAN;
BEGIN
    LOOP
        -- Generate random 5-digit code (10000 to 99999)
        new_code := LPAD((FLOOR(RANDOM() * 90000) + 10000)::TEXT, 5, '0');
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM owners WHERE code = new_code) INTO code_exists;
        
        -- If code doesn't exist, return it
        IF NOT code_exists THEN
            RETURN new_code;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Step 3: Create trigger function to auto-generate code on insert
CREATE OR REPLACE FUNCTION auto_generate_owner_code()
RETURNS TRIGGER AS $$
BEGIN
    -- Only generate code if it's NULL
    IF NEW.code IS NULL THEN
        NEW.code := generate_unique_owner_code();
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Create trigger to execute before insert
CREATE TRIGGER trigger_auto_generate_owner_code
    BEFORE INSERT ON public.owners
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_owner_code();

-- Step 5: Generate codes for existing records (if any)
UPDATE public.owners
SET code = generate_unique_owner_code()
WHERE code IS NULL;

-- Step 6: Add NOT NULL constraint after populating existing records
ALTER TABLE public.owners
ALTER COLUMN code SET NOT NULL;

-- Add comment to explain the column
COMMENT ON COLUMN public.owners.code IS 'Unique 5-digit owner identification code, automatically generated on insert';
