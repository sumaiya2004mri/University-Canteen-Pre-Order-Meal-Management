-- ============================================================================
-- Project: University Canteen Pre-Order & Meal Management System
-- Script: 04_order_functions.sql
-- Description: Concurrency-safe atomic routine to place canteen pre-orders.
--              Uses named dollar-quoting ($func$) to prevent unterminated string
--              errors during copy-paste.
-- Target RDBMS: Supabase / PostgreSQL
-- ============================================================================

CREATE OR REPLACE FUNCTION place_order(
    p_user_id       BIGINT,
    p_slot_id       INT,
    p_items_json    JSONB,
    p_notes         TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
AS $func$
DECLARE
    v_slot_max_orders   INT;
    v_slot_is_active    BOOLEAN;
    v_current_orders    INT;
    v_remaining_slots   INT;
    
    v_item              RECORD;
    v_item_name         VARCHAR(100);
    v_price             DECIMAL(10, 2);
    v_stock             INT;
    v_is_available      BOOLEAN;
    
    v_total_amount      DECIMAL(10, 2) := 0.00;
    v_subtotal          DECIMAL(10, 2);
    v_new_order_id      BIGINT;
BEGIN
    -- 1. Input Validation
    IF p_items_json IS NULL OR jsonb_array_length(p_items_json) = 0 THEN
        RETURN jsonb_build_object(
            'success', false,
            'status_code', 'EMPTY_CART',
            'message', 'Order items list cannot be empty.'
        );
    END IF;

    -- 2. Concurrency Control: Exclusive Row Lock on Pickup Slot
    SELECT max_orders, is_active
    INTO v_slot_max_orders, v_slot_is_active
    FROM pickup_slots
    WHERE slot_id = p_slot_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'status_code', 'SLOT_NOT_FOUND',
            'message', 'The requested pickup slot does not exist.'
        );
    END IF;

    IF v_slot_is_active = FALSE THEN
        RETURN jsonb_build_object(
            'success', false,
            'status_code', 'SLOT_INACTIVE',
            'message', 'The selected pickup slot is currently inactive.'
        );
    END IF;

    -- Count active orders only (excluding cancelled ones)
    SELECT COUNT(*)
    INTO v_current_orders
    FROM orders
    WHERE slot_id = p_slot_id 
      AND order_status != 'cancelled';

    IF v_current_orders >= v_slot_max_orders THEN
        RETURN jsonb_build_object(
            'success', false,
            'status_code', 'SLOT_CAPACITY_EXCEEDED',
            'active_orders', v_current_orders,
            'max_capacity', v_slot_max_orders,
            'message', format('Pickup slot is fully booked. Active orders: %s, Capacity: %s.', v_current_orders, v_slot_max_orders)
        );
    END IF;

    v_remaining_slots := v_slot_max_orders - v_current_orders;

    -- 3. Lock Menu Items & Check Stock
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items_json) AS x(item_id INT, quantity INT)
    LOOP
        IF v_item.quantity <= 0 THEN
            RETURN jsonb_build_object(
                'success', false,
                'status_code', 'INVALID_QUANTITY',
                'message', format('Quantity for item ID %s must be greater than zero.', v_item.item_id)
            );
        END IF;

        SELECT item_name, price, stock_qty, is_available
        INTO v_item_name, v_price, v_stock, v_is_available
        FROM menu_items
        WHERE item_id = v_item.item_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RETURN jsonb_build_object(
                'success', false,
                'status_code', 'ITEM_NOT_FOUND',
                'message', format('Item with ID %s was not found.', v_item.item_id)
            );
        END IF;

        IF v_is_available = FALSE THEN
            RETURN jsonb_build_object(
                'success', false,
                'status_code', 'ITEM_UNAVAILABLE',
                'message', format('Item "%s" is currently unavailable.', v_item_name)
            );
        END IF;

        IF v_stock < v_item.quantity THEN
            RETURN jsonb_build_object(
                'success', false,
                'status_code', 'INSUFFICIENT_STOCK',
                'message', format('Insufficient stock for "%s". Available: %s, Requested: %s.', v_item_name, v_stock, v_item.quantity)
            );
        END IF;

        v_total_amount := v_total_amount + (v_price * v_item.quantity);
    END LOOP;

    -- 4. Deduct Inventory Stock
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items_json) AS x(item_id INT, quantity INT)
    LOOP
        UPDATE menu_items
        SET stock_qty = stock_qty - v_item.quantity,
            updated_at = NOW()
        WHERE item_id = v_item.item_id;
    END LOOP;

    -- 5. Insert Order Header
    INSERT INTO orders (
        user_id, slot_id, order_status, total_amount, notes, created_at, updated_at
    ) VALUES (
        p_user_id, p_slot_id, 'confirmed', v_total_amount, p_notes, NOW(), NOW()
    )
    RETURNING order_id INTO v_new_order_id;

    -- 6. Insert Order Items (Historical Price Snapshot)
    FOR v_item IN SELECT * FROM jsonb_to_recordset(p_items_json) AS x(item_id INT, quantity INT)
    LOOP
        SELECT price INTO v_price FROM menu_items WHERE item_id = v_item.item_id;
        v_subtotal := v_price * v_item.quantity;

        INSERT INTO order_items (order_id, item_id, quantity, unit_price, subtotal)
        VALUES (v_new_order_id, v_item.item_id, v_item.quantity, v_price, v_subtotal);
    END LOOP;

    -- 7. Insert Initial Payment Record
    INSERT INTO payments (order_id, payment_method, payment_status, amount_paid, created_at, updated_at)
    VALUES (v_new_order_id, 'cash', 'unpaid', v_total_amount, NOW(), NOW());

    -- 8. Return Success Result
    RETURN jsonb_build_object(
        'success', true,
        'status_code', 'SUCCESS',
        'order_id', v_new_order_id,
        'total_amount', v_total_amount,
        'slot_id', p_slot_id,
        'remaining_slot_capacity', v_remaining_slots - 1,
        'message', format('Order #%s placed successfully! Total: $%s. Remaining slots: %s.', 
                         v_new_order_id, v_total_amount, v_remaining_slots - 1)
    );

EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false,
            'status_code', 'ERROR',
            'message', SQLERRM
        );
END;
$func$;
