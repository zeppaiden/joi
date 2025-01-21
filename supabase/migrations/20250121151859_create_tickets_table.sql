-- Create the tickets table
CREATE TABLE tickets (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority_level TEXT DEFAULT 'low' CHECK (priority_level IN ('low', 'medium', 'high', 'urgent')),
  created_by UUID REFERENCES users(id) NOT NULL,
  assigned_to UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- Enable row level security
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Allow customers to view their own tickets
CREATE POLICY "Customer ticket access" ON tickets  
FOR SELECT USING (created_by = auth.uid());

-- Allow agents to view their assigned tickets
CREATE POLICY "Agent ticket access" ON tickets  
FOR SELECT USING (assigned_to = auth.uid());