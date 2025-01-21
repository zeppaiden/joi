CREATE TABLE tickets (
  id UUID PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'open',
  created_by UUID REFERENCES users(id) NOT NULL,
  assigned_to UUID REFERENCES users(id)
);