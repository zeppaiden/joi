-- First, clear existing data (optional)
TRUNCATE users, tickets CASCADE;

-- Insert test users
INSERT INTO users (id, email, role, created_at, updated_at) VALUES
  ('d0d4dc14-7c31-4ede-adb6-aa009c5e5e46', 'admin@example.com', 'admin', NOW(), NOW()),
  ('e3c41712-6d3f-4aea-941f-a55c6d2f4c42', 'agent1@example.com', 'agent', NOW(), NOW()),
  ('f4b73d25-9c5b-4f8a-b8b4-6d5c7d3f8e9a', 'agent2@example.com', 'agent', NOW(), NOW()),
  ('a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'customer1@example.com', 'customer', NOW(), NOW()),
  ('b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'customer2@example.com', 'customer', NOW(), NOW());

-- Insert test tickets
INSERT INTO tickets (id, title, description, status, priority_level, created_by, assigned_to, created_at, updated_at) VALUES
  ('123e4567-e89b-12d3-a456-426614174000', 'Login not working', 'Cannot access my account', 'open', 'high', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'e3c41712-6d3f-4aea-941f-a55c6d2f4c42', NOW(), NOW()),
  ('223e4567-e89b-12d3-a456-426614174001', 'Need help with settings', 'How do I change my password?', 'in_progress', 'low', 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', 'f4b73d25-9c5b-4f8a-b8b4-6d5c7d3f8e9a', NOW(), NOW()),
  ('323e4567-e89b-12d3-a456-426614174002', 'Bug in checkout', 'Payment failing', 'resolved', 'urgent', 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', 'e3c41712-6d3f-4aea-941f-a55c6d2f4c42', NOW(), NOW()),
  ('423e4567-e89b-12d3-a456-426614174003', 'Feature request', 'Dark mode needed', 'closed', 'medium', 'b2c3d4e5-f6a7-5b6c-9d0e-1f2a3b4c5d6e', null, NOW(), NOW()); 