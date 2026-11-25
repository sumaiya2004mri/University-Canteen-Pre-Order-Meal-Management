-- ------------------------------------------------------------
-- 12_add_rls_policies.sql
-- Enable Row‑Level Security on all core tables and create policies
-- ------------------------------------------------------------

-- ----- USERS (policies already exist, keep them) -----
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- ----- ORDERS -------------------------------------------------
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Students can see only their own orders
CREATE POLICY orders_select_self ON orders
FOR SELECT TO authenticated
USING (auth.uid()::text = user_id::text);

-- Students can insert only their own orders
CREATE POLICY orders_insert_self ON orders
FOR INSERT TO authenticated
WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY orders_update_self ON orders
FOR UPDATE TO authenticated
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

-- Staff (service_role) gets full access
CREATE POLICY orders_staff_full ON orders
FOR ALL TO service_role
USING (true);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Students can see only their own orders
CREATE POLICY orders_select_self ON orders
FOR SELECT TO authenticated
USING (auth.uid()::text = user_id::text);

CREATE POLICY orders_update_self ON orders
FOR UPDATE TO authenticated
USING (auth.uid()::text = user_id::text)
WITH CHECK (auth.uid()::text = user_id::text);

-- Staff (service_role) gets full access
CREATE POLICY orders_staff_full ON orders
FOR ALL TO service_role
USING (true);

-- ----- ORDER_ITEMS --------------------------------------------
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY order_items_select_self ON order_items
FOR SELECT TO authenticated
USING (EXISTS (
   SELECT 1 FROM orders o
   WHERE o.order_id = order_items.order_id
     AND o.user_id = auth.uid()
));

CREATE POLICY order_items_staff_full ON order_items
FOR ALL TO service_role
USING (true);

-- ----- PAYMENTS ------------------------------------------------
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY payments_select_self ON payments
FOR SELECT TO authenticated
USING (EXISTS (
   SELECT 1 FROM orders o
   WHERE o.order_id = payments.order_id
     AND o.user_id = auth.uid()
));

CREATE POLICY payments_staff_full ON payments
FOR ALL TO service_role
USING (true);

-- ----- MENU_ITEMS ---------------------------------------------
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Everyone can read
CREATE POLICY menu_items_read ON menu_items
FOR SELECT TO authenticated
USING (true);

-- Staff (service_role) can modify
CREATE POLICY menu_items_staff_full ON menu_items
FOR ALL TO service_role
USING (true);

-- ----- PICKUP_SLOTS -------------------------------------------
ALTER TABLE pickup_slots ENABLE ROW LEVEL SECURITY;

CREATE POLICY pickup_slots_read ON pickup_slots
FOR SELECT TO authenticated
USING (true);

CREATE POLICY pickup_slots_staff_full ON pickup_slots
FOR ALL TO service_role
USING (true);
