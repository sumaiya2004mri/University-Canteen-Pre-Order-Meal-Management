-- ------------------------------------------------------------
-- 10_fix_orders_status.sql
-- Align `orders` status values with the spec and add extra fields
-- ------------------------------------------------------------

-- 1. Update the default status to the first life‑cycle step
ALTER TABLE orders
    ALTER COLUMN order_status SET DEFAULT 'placed';

-- 2. Normalize existing status values and extend allowed status values
-- Map legacy statuses to new lifecycle values
UPDATE orders SET order_status =
   CASE order_status
      WHEN 'pending'   THEN 'placed'
      WHEN 'confirmed' THEN 'accepted'
      WHEN 'preparing' THEN 'preparing'
      WHEN 'ready'     THEN 'ready'
      WHEN 'completed' THEN 'picked_up'
      ELSE order_status
   END;

-- 2. Normalize existing status values and extend allowed status values
-- Ensure any existing constraint is dropped before recreating
ALTER TABLE orders DROP CONSTRAINT IF EXISTS chk_orders_status;

-- Map legacy statuses to new lifecycle values
UPDATE orders SET order_status =
   CASE order_status
      WHEN 'pending'   THEN 'placed'
      WHEN 'confirmed' THEN 'accepted'
      WHEN 'preparing' THEN 'preparing'
      WHEN 'ready'     THEN 'ready'
      WHEN 'completed' THEN 'picked_up'
      ELSE order_status
   END;

-- Add the new constraint with the full allowed set
ALTER TABLE orders
   ADD CONSTRAINT chk_orders_status
   CHECK (order_status IN (
      'placed','accepted','preparing','ready','picked_up',
      'rejected','cancelled','expired'
   ));

-- 3. Add columns needed for fast pickup & expiry handling
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS expiry_at TIMESTAMP NULL;

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS pickup_code VARCHAR(8) NULL;

ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS qr_token TEXT NULL;   -- populated by server‑side function

-- 4. Estimated preparation time (minutes) – staff can update later
ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS estimated_prep_minutes INT
        DEFAULT NULL;

-- 5. Add a view that gives students the *quick‑pickup* screen data
CREATE OR REPLACE VIEW vw_student_pickup AS
SELECT
    o.order_id,
    CONCAT('CB-', LPAD(o.order_id::TEXT, 4, '0')) AS order_ref,
    o.order_status,
    o.pickup_code,
    o.qr_token,
    o.expiry_at,
    o.total_amount,
    o.payment_method,
    s.slot_date,
    s.start_time,
    s.end_time,
    o.estimated_prep_minutes
FROM orders o
JOIN pickup_slots s ON s.slot_id = o.slot_id
WHERE o.user_id = auth.uid()
  AND o.order_status IN ('ready','picked_up')
ORDER BY o.created_at DESC;
