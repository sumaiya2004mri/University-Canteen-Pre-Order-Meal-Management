-- ============================================================================
-- Project: University Canteen Pre-Order & Meal Management System
-- Script: 04_order_functions_mysql.sql
-- Description: MySQL Stored Procedure for placing canteen pre-orders.
--              Implements ACID transactions, pessimistic row-level locking
--              (SELECT ... FOR UPDATE) on pickup_slots to serialize capacity checks,
--              inventory deduction, and order placement.
-- Target RDBMS: MySQL 8.0+ (InnoDB)
-- ============================================================================

DROP PROCEDURE IF EXISTS place_order;

DELIMITER $$

CREATE PROCEDURE place_order(
    IN  p_user_id       BIGINT,
    IN  p_slot_id       INT,
    IN  p_items_json    JSON,
    IN  p_notes         VARCHAR(255),
    OUT p_order_id      BIGINT,
    OUT p_status_code   VARCHAR(50),
    OUT p_status_msg    VARCHAR(255)
)
proc_label: BEGIN

    DECLARE v_slot_max_orders   INT DEFAULT 0;
    DECLARE v_slot_is_active    BOOLEAN DEFAULT FALSE;
    DECLARE v_current_orders    INT DEFAULT 0;
    DECLARE v_remaining_slots   INT DEFAULT 0;
    
    DECLARE v_item_count        INT DEFAULT 0;
    DECLARE v_idx               INT DEFAULT 0;
    
    DECLARE v_item_id           INT;
    DECLARE v_qty               INT;
    DECLARE v_item_name         VARCHAR(100);
    DECLARE v_price             DECIMAL(10, 2);
    DECLARE v_stock             INT;
    DECLARE v_is_available      BOOLEAN;
    
    DECLARE v_subtotal          DECIMAL(10, 2) DEFAULT 0.00;
    DECLARE v_total_amount      DECIMAL(10, 2) DEFAULT 0.00;

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_order_id    = NULL;
        SET p_status_code = 'ERROR';
        SET p_status_msg  = 'Transaction failed due to an unexpected database error.';
    END;

    -- 1. Input Validation
    IF p_items_json IS NULL OR JSON_LENGTH(p_items_json) = 0 THEN
        SET p_order_id    = NULL;
        SET p_status_code = 'EMPTY_CART';
        SET p_status_msg  = 'Order items list cannot be empty.';
        LEAVE proc_label;
    END IF;

    -- 2. Begin ACID Transaction
    START TRANSACTION;

    -- ------------------------------------------------------------------------
    -- 3. Concurrency-Safe Slot Capacity Check (Pessimistic Locking)
    -- SELECT ... FOR UPDATE places an Exclusive Row-Level Lock on this slot row.
    -- Any concurrent transaction attempting to order into the SAME slot is forced
    -- to wait, preventing phantom reads and overselling beyond max_orders.
    -- ------------------------------------------------------------------------
    SELECT max_orders, is_active
    INTO v_slot_max_orders, v_slot_is_active
    FROM pickup_slots
    WHERE slot_id = p_slot_id
    FOR UPDATE;

    IF v_slot_is_active IS NULL THEN
        ROLLBACK;
        SET p_order_id    = NULL;
        SET p_status_code = 'SLOT_NOT_FOUND';
        SET p_status_msg  = 'The requested pickup slot does not exist.';
        LEAVE proc_label;
    END IF;

    IF v_slot_is_active = FALSE THEN
        ROLLBACK;
        SET p_order_id    = NULL;
        SET p_status_code = 'SLOT_INACTIVE';
        SET p_status_msg  = 'The selected pickup slot is currently inactive.';
        LEAVE proc_label;
    END IF;

    -- Count active orders only (EXCLUDING cancelled orders)
    SELECT COUNT(*)
    INTO v_current_orders
    FROM orders
    WHERE slot_id = p_slot_id 
      AND order_status != 'cancelled';

    IF v_current_orders >= v_slot_max_orders THEN
        ROLLBACK;
        SET p_order_id    = NULL;
        SET p_status_code = 'SLOT_CAPACITY_EXCEEDED';
        SET p_status_msg  = CONCAT('Pickup slot is fully booked. Active orders: ', v_current_orders, ', Maximum capacity: ', v_slot_max_orders, '.');
        LEAVE proc_label;
    END IF;

    SET v_remaining_slots = v_slot_max_orders - v_current_orders;

    -- ------------------------------------------------------------------------
    -- 4. Check Stock & Calculate Total (Row Locks on menu_items)
    -- ------------------------------------------------------------------------
    SET v_item_count = JSON_LENGTH(p_items_json);
    SET v_idx = 0;

    WHILE v_idx < v_item_count DO
        SET v_item_id = JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', v_idx, '].item_id')));
        SET v_qty     = JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', v_idx, '].quantity')));

        IF v_qty <= 0 THEN
            ROLLBACK;
            SET p_order_id    = NULL;
            SET p_status_code = 'INVALID_QUANTITY';
            SET p_status_msg  = 'Quantity must be greater than zero.';
            LEAVE proc_label;
        END IF;

        SELECT item_name, price, stock_qty, is_available
        INTO v_item_name, v_price, v_stock, v_is_available
        FROM menu_items
        WHERE item_id = v_item_id
        FOR UPDATE;

        IF v_item_name IS NULL THEN
            ROLLBACK;
            SET p_order_id    = NULL;
            SET p_status_code = 'ITEM_NOT_FOUND';
            SET p_status_msg  = CONCAT('Item with ID ', v_item_id, ' was not found.');
            LEAVE proc_label;
        END IF;

        IF v_is_available = FALSE THEN
            ROLLBACK;
            SET p_order_id    = NULL;
            SET p_status_code = 'ITEM_UNAVAILABLE';
            SET p_status_msg  = CONCAT('Item "', v_item_name, '" is currently unavailable.');
            LEAVE proc_label;
        END IF;

        IF v_stock < v_qty THEN
            ROLLBACK;
            SET p_order_id    = NULL;
            SET p_status_code = 'INSUFFICIENT_STOCK';
            SET p_status_msg  = CONCAT('Insufficient stock for "', v_item_name, '". Available: ', v_stock, ', Requested: ', v_qty, '.');
            LEAVE proc_label;
        END IF;

        SET v_subtotal     = v_price * v_qty;
        SET v_total_amount = v_total_amount + v_subtotal;

        SET v_idx = v_idx + 1;
    END WHILE;

    -- ------------------------------------------------------------------------
    -- 5. Deduct Inventory Stock
    -- ------------------------------------------------------------------------
    SET v_idx = 0;
    WHILE v_idx < v_item_count DO
        SET v_item_id = JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', v_idx, '].item_id')));
        SET v_qty     = JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', v_idx, '].quantity')));

        UPDATE menu_items
        SET stock_qty = stock_qty - v_qty
        WHERE item_id = v_item_id;

        SET v_idx = v_idx + 1;
    END WHILE;

    -- ------------------------------------------------------------------------
    -- 6. Insert Order Header
    -- ------------------------------------------------------------------------
    INSERT INTO orders (
        user_id,
        slot_id,
        order_status,
        total_amount,
        notes,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        p_slot_id,
        'confirmed',
        v_total_amount,
        p_notes,
        NOW(),
        NOW()
    );

    SET p_order_id = LAST_INSERT_ID();

    -- ------------------------------------------------------------------------
    -- 7. Insert Line Items
    -- ------------------------------------------------------------------------
    SET v_idx = 0;
    WHILE v_idx < v_item_count DO
        SET v_item_id = JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', v_idx, '].item_id')));
        SET v_qty     = JSON_UNQUOTE(JSON_EXTRACT(p_items_json, CONCAT('$[', v_idx, '].quantity')));

        SELECT price INTO v_price FROM menu_items WHERE item_id = v_item_id;
        SET v_subtotal = v_price * v_qty;

        INSERT INTO order_items (
            order_id,
            item_id,
            quantity,
            unit_price,
            subtotal
        ) VALUES (
            p_order_id,
            v_item_id,
            v_qty,
            v_price,
            v_subtotal
        );

        SET v_idx = v_idx + 1;
    END WHILE;

    -- ------------------------------------------------------------------------
    -- 8. Create Initial Payment Record
    -- ------------------------------------------------------------------------
    INSERT INTO payments (
        order_id,
        payment_method,
        payment_status,
        amount_paid,
        created_at,
        updated_at
    ) VALUES (
        p_order_id,
        'cash',
        'unpaid',
        v_total_amount,
        NOW(),
        NOW()
    );

    -- ------------------------------------------------------------------------
    -- 9. Commit Transaction
    -- ------------------------------------------------------------------------
    COMMIT;

    SET p_status_code = 'SUCCESS';
    SET p_status_msg  = CONCAT('Order #', p_order_id, ' placed successfully! Total: $', v_total_amount, '. Remaining slot capacity: ', v_remaining_slots - 1, '.');

END proc_label$$

DELIMITER ;
