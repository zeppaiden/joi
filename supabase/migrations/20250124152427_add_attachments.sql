-- Create attachments table
CREATE TABLE IF NOT EXISTS attachments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Add RLS policies for attachments
ALTER TABLE attachments ENABLE ROW LEVEL SECURITY;

-- Policy to allow users to view attachments if they can view the associated message
CREATE POLICY "Users can view attachments of messages they can see" ON attachments
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM messages m
            JOIN tickets t ON m.ticket_id = t.id
            WHERE m.id = attachments.message_id
            AND (
                t.created_by = auth.uid() OR
                t.assigned_to = auth.uid() OR
                EXISTS (
                    SELECT 1 FROM organization_members om
                    JOIN users u ON u.id = auth.uid()
                    WHERE om.organization_id = t.organization_id
                    AND om.user_id = auth.uid()
                    AND u.role IN ('admin', 'agent')
                )
            )
        )
    );

-- Policy to allow users to insert attachments on their own messages
CREATE POLICY "Users can insert attachments on their messages" ON attachments
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM messages m
            WHERE m.id = message_id
            AND m.user_id = auth.uid()
        )
    );

-- Create indexes for performance
CREATE INDEX idx_attachments_message_id ON attachments(message_id);

-- Add trigger to update updated_at timestamp
CREATE TRIGGER set_updated_at
    BEFORE UPDATE ON attachments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
