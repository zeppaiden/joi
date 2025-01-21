-- Users table
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