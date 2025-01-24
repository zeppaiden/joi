-- Drop the existing constraint
ALTER TABLE users
DROP CONSTRAINT IF EXISTS phone_number_format;

-- Add the updated constraint that allows empty strings
ALTER TABLE users
ADD CONSTRAINT phone_number_format CHECK (
  phone_number IS NULL OR 
  phone_number = '' OR 
  phone_number ~ '^\+?[1-9]\d{1,14}$'
);
