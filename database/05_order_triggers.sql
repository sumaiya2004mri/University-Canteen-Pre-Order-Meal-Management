-- ============================================================================
-- Project: University Canteen Pre-Order & Meal Management System
-- Script: 05_order_triggers.sql
-- Description: Trigger on `order_items` to automatically recalculate
--              and synchronize `orders.total_amount` whenever items are
--              inserted, updated, or deleted. Includes verifiable tests.
-- Target RDBMS: Supabase / PostgreSQL
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TRIGGER FUNCTION: update_order_total_amount()
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_order_total_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $trig$
DECLARE
    v_target_order_id BIGINT;
BEGIN
    -- Determine which order was affected:
    -- On DELETE, reference OLD.order_id
    -- On INSERT or UPDATE, reference NEW.order_id
    IF TG_OP = 'DELETE' THEN
        v_target_order_id := OLD.order_id;
    ELSE
        v_target_order_id := NEW.order_id;
    END IF;

    -- Recalculate total_amount for the affected order
    UPDATE orders
    SET 
        total_amount = COALESCE((
            SELECT SUM(subtotal)
            FROM order_items
            WHERE order_id = v_target_order_id
        ), 0.00),
        updated_at = NOW()
    WHERE order_id = v_target_order_id;

    -- If an UPDATE changed the order_id itself, update the previous order too
    IF TG_OP = 'UPDATE' AND OLD.order_id IS DISTINCT FROM NEW.order_id THEN
        UPDATE orders
        SET 
            total_amount = COALESCE((
                SELECT SUM(subtotal)
                FROM order_items
                WHERE order_id = OLD.order_id
            ), 0.00),
            updated_at = NOW()
        WHERE order_id = OLD.order_id;
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$trig$;


-- ----------------------------------------------------------------------------
-- 2. ATTACH TRIGGER TO order_items (HANDLES INSERT, UPDATE, AND DELETE)
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trg_order_items_recalculate_total ON order_items;

CREATE TRIGGER trg_order_items_recalculate_total
AFTER INSERT OR UPDATE OR DELETE ON order_items
FOR EACH ROW
EXECUTE FUNCTION update_order_total_amount();


-- ============================================================================
-- VERIFICATION TESTS: Testing INSERT, UPDATE, and DELETE
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 0: Seed sample test records (if they don't already exist)
-- ----------------------------------------------------------------------------
INSERT INTO users (full_name, email, password_hash, role)
VALUES ('Trigger Test Student', 'trigger_test@university.edu', 'hash123', 'student')
ON CONFLICT (email) DO NOTHING;

INSERT INTO categories (category_name)
VALUES ('Snacks & Burgers')
ON CONFLICT (category_name) DO NOTHING;

INSERT INTO menu_items (category_id, item_name, price, stock_qty)
SELECT category_id, 'Chicken Burger', 5.00, 100
FROM categories WHERE category_name = 'Snacks & Burgers'
ON CONFLICT DO NOTHING;

INSERT INTO menu_items (category_id, item_name, price, stock_qty)
SELECT category_id, 'Lemonade', 2.00, 100
FROM categories WHERE category_name = 'Snacks & Burgers'
ON CONFLICT DO NOTHING;

INSERT INTO pickup_slots (slot_date, start_time, end_time, max_orders)
VALUES ('2026-12-01', '12:00:00', '12:30:00', 50)
ON CONFLICT (slot_date, start_time, end_time) DO NOTHING;

-- Create a fresh test order with initial total_amount = 0.00
INSERT INTO orders (user_id, slot_id, order_status, total_amount)
VALUES (
    (SELECT user_id FROM users WHERE email = 'trigger_test@university.edu' LIMIT 1),
    (SELECT slot_id FROM pickup_slots WHERE slot_date = '2026-12-01' LIMIT 1),
    'pending',
    0.00
);

-- ----------------------------------------------------------------------------
-- TEST 1: INSERT OPERATION
-- Add 2 Chicken Burgers ($5.00 each -> subtotal $10.00)
-- ----------------------------------------------------------------------------
INSERT INTO order_items (order_id, item_id, quantity, unit_price, subtotal)
VALUES (
    (SELECT MAX(order_id) FROM orders),
    (SELECT item_id FROM menu_items WHERE item_name = 'Chicken Burger' LIMIT 1),
    2,
    5.00,
    10.00
);

-- Verify Result 1: total_amount should automatically become 10.00
SELECT order_id, total_amount, updated_at 
FROM orders 
WHERE order_id = (SELECT MAX(order_id) FROM orders);


-- ----------------------------------------------------------------------------
-- TEST 2: UPDATE OPERATION
-- Increase quantity from 2 to 4 (subtotal becomes $20.00)
-- ----------------------------------------------------------------------------
UPDATE order_items
SET quantity = 4, subtotal = 20.00
WHERE order_id = (SELECT MAX(order_id) FROM orders)
  AND item_id = (SELECT item_id FROM menu_items WHERE item_name = 'Chicken Burger' LIMIT 1);

-- Verify Result 2: total_amount should automatically become 20.00
SELECT order_id, total_amount, updated_at 
FROM orders 
WHERE order_id = (SELECT MAX(order_id) FROM orders);


-- ----------------------------------------------------------------------------
-- TEST 3: DELETE OPERATION
-- Delete the item from order_items
-- ----------------------------------------------------------------------------
DELETE FROM order_items
WHERE order_id = (SELECT MAX(order_id) FROM orders)
  AND item_id = (SELECT item_id FROM menu_items WHERE item_name = 'Chicken Burger' LIMIT 1);

-- Verify Result 3: total_amount should automatically drop back to 0.00
SELECT order_id, total_amount, updated_at 
FROM orders 
WHERE order_id = (SELECT MAX(order_id) FROM orders);
