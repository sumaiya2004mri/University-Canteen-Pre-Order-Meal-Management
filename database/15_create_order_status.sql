-- 15_create_order_status.sql
-- Adds a CHECK constraint for order_status values (MySQL 8.0+)
ALTER TABLE orders
  MODIFY COLUMN order_status VARCHAR(20) NOT NULL DEFAULT 'Pending',
  ADD CONSTRAINT chk_order_status CHECK (order_status IN ('Pending','Accepted','Preparing','Ready','Picked_Up','Rejected','Cancelled','Expired'));
