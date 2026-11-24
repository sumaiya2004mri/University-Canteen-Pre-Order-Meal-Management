-- ============================================================================
-- Project: University Canteen Pre-Order & Meal Management System
-- Script: 06_cancel_order.sql
-- Description: Concurrency-safe atomic routine to cancel canteen orders.
--              Enforces 15-minute cutoff, restores inventory stock, prevents
--              duplicate cancellation, and validates user authorization.
-- Target RDBMS: Supabase / PostgreSQL (Callable Function returning JSONB)
-- ============================================================================

CREATE OR REPLACE FUNCTION cancel_order(
    p_order_id  BIGINT,
    p_user_id   BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
AS $func$
DECLARE
    v_order_user_id         BIGINT;
    v_order_status          VARCHAR(20);
    v_slot_id               INT;
    v_slot_date             DATE;
    v_start_time            TIME;
    v_slot_start_timestamp  TIMESTAMP;
    v_user_role             VARCHAR(20);
    
    v_item                  RECORD;
    v_restored_count        INT := 0;
BEGIN
    -- 1. Validate User Existence & Role (Rule 7)
    SELECT role INTO v_user_role
    FROM users
    WHERE user_id = p_user_id;

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'status_code', 'USER_NOT_FOUND',
            'message', 'User account does not exist.'
        );
    END IF;

    -- 2. Concurrency Control: Exclusive Row Lock on Order (Rules 6, 7 & 8)
    SELECT 
        o.user_id,
        o.order_status,
        o.slot_id,
        s.slot_date,
        s.start_time
    INTO 
        v_order_user_id,
        v_order_status,
        v_slot_id,
        v_slot_date,
        v_start_time
    FROM orders o
    JOIN pickup_slots s ON o.slot_id = s.slot_id
    WHERE o.order_id = p_order_id
    FOR UPDATE OF o;

    -- Handle invalid order ID (Rule 7)
    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'success', false,
            'status_code', 'ORDER_NOT_FOUND',
            'message', format('Order #%s does not exist.', p_order_id)
        );
    END IF;

    -- Handle unauthorized users (Rule 7)
    IF v_order_user_id != p_user_id AND v_user_role NOT IN ('admin', 'canteen_staff') THEN
        RETURN jsonb_build_object(
            'success', false,
            'status_code', 'UNAUTHORIZED',
            'message', 'You are not authorized to cancel this order.'
        );
    END IF;

    -- Prevent duplicate cancellation (Rule 6)
    IF v_order_status = 'cancelled' THEN
        RETURN jsonb_build_object(
            'success', false,
            'status_code', 'ALREADY_CANCELLED',
            'message', format('Order #%s has already been cancelled.', p_order_id)
        );
    END IF;

    -- Only orders with status 'placed' or 'pending' can be cancelled (Rule 1)
    IF v_order_status NOT IN ('placed', 'pending') THEN
        RETURN jsonb_build_object(
            'success', false,
            'status_code', 'INVALID_STATUS',
            'message', format('Cannot cancel order in "%s" state. Only newly placed orders can be cancelled.', v_order_status)
        );
    END IF;

    -- 3. Enforce 15-Minute Cutoff Window (Rule 2)
    v_slot_start_timestamp := (v_slot_date + v_start_time)::TIMESTAMP;

    IF NOW() > (v_slot_start_timestamp - INTERVAL '15 minutes') THEN
        RETURN jsonb_build_object(
            'success', false,
            'status_code', 'CUTOFF_EXCEEDED',
            'message', 'Cancellation deadline passed. Orders must be cancelled at least 15 minutes before the pickup slot starts.'
        );
    END IF;

    -- 4. Restore Stock Quantities of Every Order Item (Rule 3 & 8)
    FOR v_item IN 
        SELECT item_id, quantity 
        FROM order_items 
        WHERE order_id = p_order_id 
        FOR UPDATE
    LOOP
        UPDATE menu_items
        SET stock_qty = stock_qty + v_item.quantity,
            updated_at = NOW()
        WHERE item_id = v_item.item_id;

        v_restored_count := v_restored_count + 1;
    END LOOP;

    -- 5. Update Order Status to 'cancelled' and Record cancelled_at (Rules 4 & 5)
    UPDATE orders
    SET 
        order_status = 'cancelled',
        cancelled_at = NOW(),
        updated_at = NOW()
    WHERE order_id = p_order_id;

    -- Update payments record if exists
    UPDATE payments
    SET 
        payment_status = 'refunded',
        updated_at = NOW()
    WHERE order_id = p_order_id AND payment_status = 'completed';

    -- 6. Return Useful Success Result (Rule 9)
    RETURN jsonb_build_object(
        'success', true,
        'status_code', 'CANCELLED_SUCCESS',
        'order_id', p_order_id,
        'restored_items_count', v_restored_count,
        'cancelled_at', NOW(),
        'message', format('Order #%s cancelled successfully. Stock has been restored for %s item(s).', p_order_id, v_restored_count)
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
