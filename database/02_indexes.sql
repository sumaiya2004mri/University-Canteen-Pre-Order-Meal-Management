-- ============================================================================
-- Project: University Canteen Pre-Order & Meal Management System
-- Script: 02_indexes.sql
-- Description: Performance optimization indexes for high-frequency operations.
--              Includes IF NOT EXISTS for safe, idempotent re-execution.
-- ============================================================================

-- ============================================================================
-- 1. TABLE: orders
-- ============================================================================

-- Finding orders by user_id ("My Orders" customer page)
CREATE INDEX IF NOT EXISTS idx_orders_user_id 
    ON orders (user_id);

-- Finding orders by order_status (Kitchen display screen)
CREATE INDEX IF NOT EXISTS idx_orders_status 
    ON orders (order_status);

-- Finding orders by created_at (Daily sales reporting and sorting)
CREATE INDEX IF NOT EXISTS idx_orders_created_at 
    ON orders (created_at DESC);

-- Finding orders by pickup slot_id (Kitchen meal staging)
CREATE INDEX IF NOT EXISTS idx_orders_slot_id 
    ON orders (slot_id);


-- ============================================================================
-- 2. TABLE: menu_items
-- ============================================================================

-- Finding menu items by category_id (Category filter buttons)
CREATE INDEX IF NOT EXISTS idx_menu_items_category_id 
    ON menu_items (category_id);

-- Filtering active/available menu items for student menu catalog
CREATE INDEX IF NOT EXISTS idx_menu_items_is_available 
    ON menu_items (is_available);


-- ============================================================================
-- 3. TABLE: order_items
-- ============================================================================

-- Finding order items by item_id (Item popularity analysis)
-- Note: (order_id, item_id) is already indexed by uq_order_item constraint.
CREATE INDEX IF NOT EXISTS idx_order_items_item_id 
    ON order_items (item_id);


-- ============================================================================
-- 4. TABLE: pickup_slots
-- ============================================================================

-- Composite index for active pickup slots on a given date (Slot picker)
CREATE INDEX IF NOT EXISTS idx_pickup_slots_date_active 
    ON pickup_slots (slot_date, is_active);


-- ============================================================================
-- 5. TABLE: payments
-- ============================================================================

-- Finding payments by order_id (Counter verification)
CREATE INDEX IF NOT EXISTS idx_payments_order_id 
    ON payments (order_id);

-- Finding payments by payment_status (Finance audit)
CREATE INDEX IF NOT EXISTS idx_payments_status 
    ON payments (payment_status);
