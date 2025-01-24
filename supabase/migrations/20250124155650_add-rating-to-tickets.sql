-- Add rating column to tickets table
ALTER TABLE tickets ADD COLUMN rating INTEGER CHECK (rating >= 1 AND rating <= 5);

-- Add comment to explain the rating scale
COMMENT ON COLUMN tickets.rating IS 'Customer satisfaction rating from 1-5 stars';
