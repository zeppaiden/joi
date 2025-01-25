-- Drop existing foreign key constraints
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_created_by_fkey;
ALTER TABLE tickets DROP CONSTRAINT IF EXISTS tickets_assigned_to_fkey;

-- Create function to handle user deletion
CREATE OR REPLACE FUNCTION handle_user_deletion()
RETURNS TRIGGER AS $$
BEGIN
    -- Soft delete all tickets where the user is the creator
    UPDATE tickets
    SET deleted_at = NOW(),
        updated_at = NOW()
    WHERE created_by = OLD.id
    AND deleted_at IS NULL;
    
    -- Remove user from assigned_to for any tickets
    UPDATE tickets
    SET assigned_to = NULL,
        updated_at = NOW()
    WHERE assigned_to = OLD.id;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for user deletion
DROP TRIGGER IF EXISTS on_user_deletion ON users;
CREATE TRIGGER on_user_deletion
    BEFORE DELETE ON users
    FOR EACH ROW
    EXECUTE FUNCTION handle_user_deletion();

-- Add back the foreign key constraints with NO ACTION
ALTER TABLE tickets
    ADD CONSTRAINT tickets_created_by_fkey
    FOREIGN KEY (created_by)
    REFERENCES users(id)
    ON DELETE NO ACTION;

ALTER TABLE tickets
    ADD CONSTRAINT tickets_assigned_to_fkey
    FOREIGN KEY (assigned_to)
    REFERENCES users(id)
    ON DELETE NO ACTION;

-- Add comments
COMMENT ON FUNCTION handle_user_deletion() IS 'Handles soft deletion of tickets when a user is deleted';
COMMENT ON TRIGGER on_user_deletion ON users IS 'Trigger to soft delete tickets when a user is deleted';
