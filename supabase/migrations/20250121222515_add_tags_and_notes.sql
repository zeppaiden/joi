-- Create tags table for reusable tags
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT tags_name_not_empty CHECK (length(trim(name)) > 0)
);

-- Create ticket_tags junction table
CREATE TABLE ticket_tags (
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (ticket_id, tag_id)
);

-- Create internal notes table
CREATE TABLE internal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  deleted_at TIMESTAMPTZ,
  CONSTRAINT internal_notes_content_not_empty CHECK (length(trim(content)) > 0)
);

-- Create updated_at trigger for internal_notes
CREATE TRIGGER set_internal_notes_updated_at
  BEFORE UPDATE ON internal_notes
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Enable RLS
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE internal_notes ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tags
CREATE POLICY "Staff can manage tags"
  ON tags
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM users 
      WHERE role IN ('admin', 'agent') 
      AND deleted_at IS NULL
    )
  );

-- RLS Policies for ticket_tags
CREATE POLICY "Staff can manage ticket tags"
  ON ticket_tags
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM users 
      WHERE role IN ('admin', 'agent') 
      AND deleted_at IS NULL
    )
  );

-- RLS Policies for internal_notes
CREATE POLICY "Staff can manage internal notes"
  ON internal_notes
  FOR ALL
  TO authenticated
  USING (
    auth.uid() IN (
      SELECT id FROM users 
      WHERE role IN ('admin', 'agent') 
      AND deleted_at IS NULL
    )
  );

-- Create indexes
CREATE INDEX tags_name_idx ON tags(name);
CREATE INDEX ticket_tags_ticket_id_idx ON ticket_tags(ticket_id);
CREATE INDEX ticket_tags_tag_id_idx ON ticket_tags(tag_id);
CREATE INDEX internal_notes_ticket_id_idx ON internal_notes(ticket_id);
CREATE INDEX internal_notes_created_at_idx ON internal_notes(created_at);
