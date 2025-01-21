CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT auth.uid(),
  email TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'agent', 'customer')) NOT NULL
);