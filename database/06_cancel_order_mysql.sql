-- ============================================================================
-- Project: University Canteen Pre-Order & Meal Management System
-- Script: 06_cancel_order_mysql.sql
-- Description: MySQL Stored Procedure for order cancellation.
--              Implements ACID transactions, row-level locking (SELECT ... FOR UPDATE),
--              15-minute cutoff, inventory restoration, and status updates.
-- Target RDBMS: MySQL 8.0+ (InnoDB)
-- ============================================================================

DROP PROCEDURE IF EXISTS cancel_order;

DELIMITER $$

CREATE PROCEDURE cancel_order(
    IN  p_order_id      BIGINT,
    IN  p_user_id       BIGINT,
    OUT p_status_code   VARCHAR(50),
    OUT p_status_msg    VARCHAR(255)
)
proc_label: BEGIN

    -- ------------------------------------------------------------------------
    -- 1. Local Variables
    -- ------------------------------------------------------------------------
    DECLARE v_order_user_id         BIGINT;
    DECLARE v_order_status          VARCHAR(20);
    DECLARE v_slot_id               INT;
    DECLARE v_slot_date             DATE;
    DECLARE v_start_time            TIME;
    DECLARE v_slot_start_datetime   DATETIME;
    DECLARE v_user_role             VARCHAR(20);
    
    DECLARE v_done                  INT DEFAULT FALSE;
    DECLARE v_item_id               INT;
    DECLARE v_item_qty              INT;
    DECLARE v_restored_count        INT DEFAULT 0;

    -- Cursor to iterate over order items for stock restoration
    DECLARE cur_items CURSOR FOR 
        SELECT item_id, quantity 
        FROM order_items 
        WHERE order_id = p_order_id;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET v_done = TRUE;

    -- Exception Handler: Automatic Rollback on SQL Error
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        SET p_status_code = 'ERROR';
        SET p_status_msg  = 'Cancellation aborted due to an unexpected database error.';
    END;

    -- ------------------------------------------------------------------------
    -- 2. Validate User Existence
    -- ------------------------------------------------------------------------
    SELECT role INTO v_user_role
    FROM users
    WHERE user_id = p_user_id;

    IF v_user_role IS NULL THEN
        SET p_status_code = 'USER_NOT_FOUND';
        SET p_status_msg  = 'User account does not exist.';
        LEAVE proc_label;
    END IF;

    -- ------------------------------------------------------------------------
    -- 3. Begin ACID Transaction
    -- ------------------------------------------------------------------------
    START TRANSACTION;

    -- ------------------------------------------------------------------------
    -- 4. Concurrency Control: Lock the Order Row Exclusively
    -- ------------------------------------------------------------------------
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
    FOR UPDATE;

    -- Rule 7: Handle invalid order IDs
    IF v_order_user_id IS NULL THEN
        ROLLBACK;
        SET p_status_code = 'ORDER_NOT_FOUND';
        SET p_status_msg  = CONCAT('Order #', p_order_id, ' does not exist.');
        LEAVE proc_label;
    END IF;

    -- Rule 7: Validate user authorization
    IF v_order_user_id != p_user_id AND v_user_role NOT IN ('admin', 'canteen_staff') THEN
        ROLLBACK;
        SET p_status_code = 'UNAUTHORIZED';
        SET p_status_msg  = 'You are not authorized to cancel this order.';
        LEAVE proc_label;
    END IF;

    -- Rule 6: Prevent duplicate cancellation
    IF v_order_status = 'cancelled' THEN
        ROLLBACK;
        SET p_status_code = 'ALREADY_CANCELLED';
        SET p_status_msg  = CONCAT('Order #', p_order_id, ' is already cancelled.');
        LEAVE proc_label;
    END IF;

    -- Rule 1: Only orders with status 'placed' (or 'pending') can be cancelled
    IF v_order_status NOT IN ('placed', 'pending') THEN
        ROLLBACK;
        SET p_status_code = 'INVALID_STATUS';
        SET p_status_msg  = CONCAT('Cannot cancel order in "', v_order_status, '" state. Kitchen may already be preparing it.');
        LEAVE proc_label;
    END IF;

    -- ------------------------------------------------------------------------
    -- Rule 2: 15-Minute Cancellation Cutoff Window
    -- ------------------------------------------------------------------------
    SET v_slot_start_datetime = TIMESTAMP(v_slot_date, v_start_time);

    IF NOW() > DATE_SUB(v_slot_start_datetime, INTERVAL 15 MINUTE) THEN
        ROLLBACK;
        SET p_status_code = 'CUTOFF_EXCEEDED';
        SET p_status_msg  = 'Cancellation cutoff passed. Must cancel at least 15 minutes before the pickup slot starts.';
        LEAVE proc_label;
    END IF;

    -- ------------------------------------------------------------------------
    -- Rule 3: Restore Stock Quantities of Every Order Item
    -- ------------------------------------------------------------------------
    OPEN cur_items;

    read_loop: LOOP
        FETCH cur_items INTO v_item_id, v_item_qty;
        IF v_done THEN
            LEAVE read_loop;
        END IF;

        -- Lock menu item row and increment stock
        UPDATE menu_items
        SET stock_qty = stock_qty + v_item_qty
        WHERE item_id = v_item_id;

        SET v_restored_count = v_restored_count + 1;
    END LOOP;

    CLOSE cur_items;

    -- ------------------------------------------------------------------------
    -- Rule 4 & 5: Update Order Status to 'cancelled' and Record cancelled_at
    -- ------------------------------------------------------------------------
    UPDATE orders
    SET 
        order_status = 'cancelled',
        cancelled_at = NOW(),
        updated_at   = NOW()
    WHERE order_id = p_order_id;

    -- Update payments record if exists
    UPDATE payments
    SET 
        payment_status = 'refunded',
        updated_at     = NOW()
    WHERE order_id = p_order_id AND payment_status = 'completed';

    -- ------------------------------------------------------------------------
    -- Commit Transaction
    -- ------------------------------------------------------------------------
    COMMIT;

    SET p_status_code = 'SUCCESS';
    SET p_status_msg  = CONCAT('Order #', p_order_id, ' cancelled successfully. Stock restored for ', v_restored_count, ' item(s).');

END proc_label$$

DELIMITER ;
