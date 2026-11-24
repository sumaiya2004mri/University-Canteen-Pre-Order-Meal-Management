-- ============================================================================
-- Project: University Canteen Pre-Order & Meal Management System
-- Script: 05_order_triggers_mysql.sql
-- Description: MySQL Triggers on `order_items` to recalculate orders.total_amount
--              on INSERT, UPDATE, and DELETE. For academic submission / local MySQL.
-- Target RDBMS: MySQL 8.0+ (InnoDB)
-- ============================================================================

-- In MySQL, separate triggers are required for INSERT, UPDATE, and DELETE.

DROP TRIGGER IF EXISTS trg_order_items_after_insert;
DROP TRIGGER IF EXISTS trg_order_items_after_update;
DROP TRIGGER IF EXISTS trg_order_items_after_delete;

DELIMITER $$

-- ----------------------------------------------------------------------------
-- 1. TRIGGER: AFTER INSERT
-- ----------------------------------------------------------------------------
CREATE TRIGGER trg_order_items_after_insert
AFTER INSERT ON order_items
FOR EACH ROW
BEGIN
    UPDATE orders
    SET total_amount = (
        SELECT COALESCE(SUM(subtotal), 0.00)
        FROM order_items
        WHERE order_id = NEW.order_id
    ),
    updated_at = NOW()
    WHERE order_id = NEW.order_id;
END$$

-- ----------------------------------------------------------------------------
-- 2. TRIGGER: AFTER UPDATE
-- ----------------------------------------------------------------------------
CREATE TRIGGER trg_order_items_after_update
AFTER UPDATE ON order_items
FOR EACH ROW
BEGIN
    -- Update total for the new order
    UPDATE orders
    SET total_amount = (
        SELECT COALESCE(SUM(subtotal), 0.00)
        FROM order_items
        WHERE order_id = NEW.order_id
    ),
    updated_at = NOW()
    WHERE order_id = NEW.order_id;

    -- If order_id changed, update previous order as well
    IF OLD.order_id != NEW.order_id THEN
        UPDATE orders
        SET total_amount = (
            SELECT COALESCE(SUM(subtotal), 0.00)
            FROM order_items
            WHERE order_id = OLD.order_id
        ),
        updated_at = NOW()
        WHERE order_id = OLD.order_id;
    END IF;
END$$

-- ----------------------------------------------------------------------------
-- 3. TRIGGER: AFTER DELETE
-- ----------------------------------------------------------------------------
CREATE TRIGGER trg_order_items_after_delete
AFTER DELETE ON order_items
FOR EACH ROW
BEGIN
    UPDATE orders
    SET total_amount = (
        SELECT COALESCE(SUM(subtotal), 0.00)
        FROM order_items
        WHERE order_id = OLD.order_id
    ),
    updated_at = NOW()
    WHERE order_id = OLD.order_id;
END$$

DELIMITER ;
