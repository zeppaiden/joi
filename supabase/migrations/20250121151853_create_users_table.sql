-- Create the users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email TEXT NOT NULL UNIQUE,
  role TEXT CHECK (role IN ('admin', 'agent', 'customer')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Enable row level security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow users to create their own user record
CREATE POLICY "Users can create their own user record"
ON users FOR INSERT
WITH CHECK (auth.uid() = id);

-- Allow users to read all user records (needed for user lookup)
CREATE POLICY "Users can view all users"
ON users FOR SELECT
TO authenticated
USING (true);

-- Allow users to update their own record
CREATE POLICY "Users can update own record"
ON users FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
