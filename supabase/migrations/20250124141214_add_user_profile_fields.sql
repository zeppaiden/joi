-- Add new columns to users table
ALTER TABLE users
ADD COLUMN first_name text,
ADD COLUMN last_name text,
ADD COLUMN phone_number text,
ADD COLUMN avatar_url text,
ADD COLUMN timezone text DEFAULT 'UTC';

-- Add check constraint for phone number format (optional, basic validation)
ALTER TABLE users
ADD CONSTRAINT phone_number_format CHECK (
  phone_number IS NULL OR 
  phone_number ~ '^\+?[1-9]\d{1,14}$'
);

-- Comment on columns
COMMENT ON COLUMN users.first_name IS 'User''s first name';
COMMENT ON COLUMN users.last_name IS 'User''s last name';
COMMENT ON COLUMN users.phone_number IS 'User''s phone number in E.164 format';
COMMENT ON COLUMN users.avatar_url IS 'URL to user''s profile picture';
COMMENT ON COLUMN users.timezone IS 'User''s preferred timezone';
