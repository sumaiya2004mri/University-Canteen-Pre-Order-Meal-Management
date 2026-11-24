-- ============================================================================
-- Project: University Canteen Pre-Order & Meal Management System
-- Script: 08_system_tests.sql
-- Description: Complete 10-Step Automated Database Test Battery
--              Catches expected error scenarios (like FK violation) so the entire
--              test suite runs cleanly from start to finish without halting.
-- Target RDBMS: MySQL 8.0+ / Supabase
-- ============================================================================

-- ----------------------------------------------------------------------------
-- SETUP: Ensure base test records exist
-- ----------------------------------------------------------------------------
INSERT INTO users (full_name, email, password_hash, role)
VALUES ('Test Student', 'test_student@university.edu', 'secret123', 'student')
ON CONFLICT (email) DO NOTHING;

INSERT INTO categories (category_name)
VALUES ('Main Meals')
ON CONFLICT (category_name) DO NOTHING;

INSERT INTO menu_items (category_id, item_name, price, stock_qty, is_available)
SELECT category_id, 'Chicken Fried Rice', 7.50, 25, TRUE
FROM categories WHERE category_name = 'Main Meals'
ON CONFLICT DO NOTHING;

INSERT INTO pickup_slots (slot_date, start_time, end_time, max_orders, is_active)
VALUES ('2026-12-10', '12:00:00', '12:30:00', 30, TRUE)
ON CONFLICT (slot_date, start_time, end_time) DO NOTHING;


-- ============================================================================
-- TEST 1: Insert a valid order
-- Expected Result: SUCCESS
-- ============================================================================
SELECT place_order(
    (SELECT user_id FROM users WHERE email = 'test_student@university.edu' LIMIT 1),
    (SELECT slot_id FROM pickup_slots WHERE slot_date = '2026-12-10' LIMIT 1),
    '[{"item_id": 1, "quantity": 1}]'::jsonb,
    'Test 1: Valid Order'
) AS test_1_result;


-- ============================================================================
-- TEST 2: Order unavailable food
-- Expected Result: REJECTED (ITEM_UNAVAILABLE)
-- ============================================================================
UPDATE menu_items SET is_available = FALSE WHERE item_id = 1;

SELECT place_order(
    (SELECT user_id FROM users WHERE email = 'test_student@university.edu' LIMIT 1),
    (SELECT slot_id FROM pickup_slots WHERE slot_date = '2026-12-10' LIMIT 1),
    '[{"item_id": 1, "quantity": 1}]'::jsonb,
    'Test 2: Unavailable Item'
) AS test_2_result;

UPDATE menu_items SET is_available = TRUE WHERE item_id = 1;


-- ============================================================================
-- TEST 3: Exceed stock quantity
-- Expected Result: REJECTED (INSUFFICIENT_STOCK)
-- ============================================================================
SELECT place_order(
    (SELECT user_id FROM users WHERE email = 'test_student@university.edu' LIMIT 1),
    (SELECT slot_id FROM pickup_slots WHERE slot_date = '2026-12-10' LIMIT 1),
    '[{"item_id": 1, "quantity": 9999}]'::jsonb,
    'Test 3: Exceed Stock'
) AS test_3_result;


-- ============================================================================
-- TEST 4: Book full pickup slot
-- Expected Result: REJECTED (SLOT_CAPACITY_EXCEEDED)
-- ============================================================================
-- Create an exclusive 1-capacity test slot
INSERT INTO pickup_slots (slot_date, start_time, end_time, max_orders, is_active)
VALUES ('2026-12-11', '13:00:00', '13:30:00', 1, TRUE)
ON CONFLICT (slot_date, start_time, end_time) DO UPDATE SET max_orders = 1;

-- Fill the slot (Attempt 1 succeeds)
SELECT place_order(
    (SELECT user_id FROM users WHERE email = 'test_student@university.edu' LIMIT 1),
    (SELECT slot_id FROM pickup_slots WHERE slot_date = '2026-12-11' LIMIT 1),
    '[{"item_id": 1, "quantity": 1}]'::jsonb,
    'Test 4: Fill Slot'
) AS test_4_fill_result;

-- Attempt 2 fails because slot is at max capacity
SELECT place_order(
    (SELECT user_id FROM users WHERE email = 'test_student@university.edu' LIMIT 1),
    (SELECT slot_id FROM pickup_slots WHERE slot_date = '2026-12-11' LIMIT 1),
    '[{"item_id": 1, "quantity": 1}]'::jsonb,
    'Test 4: Overbook Slot'
) AS test_4_overbook_result;


-- ============================================================================
-- TEST 5: Cancel eligible order
-- Expected Result: SUCCESS (Status -> cancelled, stock restored)
-- ============================================================================
SELECT cancel_order(
    (SELECT MAX(order_id) FROM orders WHERE order_status = 'confirmed'),
    (SELECT user_id FROM users WHERE email = 'test_student@university.edu' LIMIT 1)
) AS test_5_result;


-- ============================================================================
-- TEST 6: Cancel after cutoff (< 15 minutes before slot start)
-- Expected Result: REJECTED (CUTOFF_EXCEEDED)
-- ============================================================================
-- Create a slot starting in 2 minutes
INSERT INTO pickup_slots (slot_date, start_time, end_time, max_orders, is_active)
VALUES (CURRENT_DATE, (CURRENT_TIME + INTERVAL '2 minutes')::TIME, (CURRENT_TIME + INTERVAL '32 minutes')::TIME, 50, TRUE);

-- Book order
SELECT place_order(
    (SELECT user_id FROM users WHERE email = 'test_student@university.edu' LIMIT 1),
    (SELECT MAX(slot_id) FROM pickup_slots),
    '[{"item_id": 1, "quantity": 1}]'::jsonb,
    'Test 6: Order in immediate slot'
) AS test_6_order_placement;

-- Attempt cancellation within 15-minute window
SELECT cancel_order(
    (SELECT MAX(order_id) FROM orders),
    (SELECT user_id FROM users WHERE email = 'test_student@university.edu' LIMIT 1)
) AS test_6_cancellation_result;


-- ============================================================================
-- TEST 7: Cancel twice
-- Expected Result: REJECTED (ALREADY_CANCELLED)
-- ============================================================================
SELECT cancel_order(
    (SELECT MAX(order_id) FROM orders WHERE order_status = 'cancelled'),
    (SELECT user_id FROM users WHERE email = 'test_student@university.edu' LIMIT 1)
) AS test_7_result;


-- ============================================================================
-- TEST 8: Change menu price
-- Expected Result: Historical unit_price in past orders remains UNCHANGED
-- ============================================================================
SELECT order_id, item_id, unit_price AS price_before_menu_update 
FROM order_items LIMIT 1;

UPDATE menu_items SET price = price + 5.00 WHERE item_id = 1;

SELECT order_id, item_id, unit_price AS price_after_menu_update 
FROM order_items LIMIT 1;


-- ============================================================================
-- TEST 9: Delete referenced category
-- Expected Result: BLOCKED BY FOREIGN KEY (ON DELETE RESTRICT)
-- Handled inside a DO block so test runner confirms pass without halting.
-- ============================================================================
DO $test9$
BEGIN
    DELETE FROM categories WHERE category_id = (SELECT category_id FROM menu_items LIMIT 1);
    RAISE EXCEPTION 'TEST 9 FAILED: Category was deleted but should have been blocked by FK!';
EXCEPTION
    WHEN foreign_key_violation THEN
        RAISE NOTICE '>>> TEST 9 PASSED: Category deletion blocked by foreign key constraint fk_menu_items_category (RESTRICT) as expected. <<<';
END;
$test9$;


-- ============================================================================
-- TEST 10: Add order item (Trigger Recalculation)
-- Expected Result: orders.total_amount automatically recalculated by trigger
-- ============================================================================
-- 1. Create a fresh clean order with initial total = 0.00
INSERT INTO orders (user_id, slot_id, order_status, total_amount)
VALUES (
    (SELECT user_id FROM users WHERE email = 'test_student@university.edu' LIMIT 1),
    (SELECT slot_id FROM pickup_slots LIMIT 1),
    'pending',
    0.00
);

-- 2. Verify initial total is 0.00
SELECT order_id, total_amount AS initial_total 
FROM orders 
WHERE order_id = (SELECT MAX(order_id) FROM orders);

-- 3. Insert a line item into this newly created order (2 items @ $7.50 = $15.00)
INSERT INTO order_items (order_id, item_id, quantity, unit_price, subtotal)
VALUES (
    (SELECT MAX(order_id) FROM orders),
    1,
    2,
    7.50,
    15.00
);

-- 4. Check updated total: The trigger automatically recalculated total_amount to 15.00!
SELECT order_id, total_amount AS recalculated_total, updated_at 
FROM orders 
WHERE order_id = (SELECT MAX(order_id) FROM orders);
