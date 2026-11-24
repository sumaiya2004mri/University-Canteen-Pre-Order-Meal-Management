-- ============================================================================
-- Project: University Canteen Pre-Order & Meal Management System
-- Script: 07_reports_views.sql
-- Description: Reusable reporting views and analytical SQL queries
-- Target RDBMS: MySQL 8.0+
-- ============================================================================

-- ============================================================================
-- VIEW 1: daily_sales_view
-- Purpose: Aggregates daily pre-order volume and total revenue (excluding cancelled orders)
-- Columns: order_day, total_orders, total_revenue
-- ============================================================================
CREATE OR REPLACE VIEW daily_sales_view AS
SELECT 
    DATE(o.created_at) AS order_day,
    COUNT(o.order_id) AS total_orders,
    COALESCE(SUM(o.total_amount), 0.00) AS total_revenue
FROM orders o
WHERE o.order_status != 'cancelled'
GROUP BY DATE(o.created_at)
ORDER BY order_day DESC;


-- ============================================================================
-- VIEW 2: popular_items_view
-- Purpose: Ranks food and drink items based on lifetime units sold
-- Columns: item_name, category_name, total_quantity_sold, popularity_rank
-- ============================================================================
CREATE OR REPLACE VIEW popular_items_view AS
SELECT 
    m.item_name,
    c.category_name,
    COALESCE(SUM(oi.quantity), 0) AS total_quantity_sold,
    DENSE_RANK() OVER (ORDER BY COALESCE(SUM(oi.quantity), 0) DESC) AS popularity_rank
FROM menu_items m
JOIN categories c ON m.category_id = c.category_id
LEFT JOIN order_items oi ON m.item_id = oi.item_id
LEFT JOIN orders o ON oi.order_id = o.order_id AND o.order_status != 'cancelled'
GROUP BY m.item_id, m.item_name, c.category_name;


-- ============================================================================
-- ADDITIONAL ANALYTICAL QUERIES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Query 1: Peak Ordering Hours
-- DBMS Concepts: GROUP BY, EXTRACT / HOUR()
-- Identifies the rush hours during the day to optimize kitchen staffing.
-- ----------------------------------------------------------------------------
SELECT 
    EXTRACT(HOUR FROM o.created_at) AS order_hour,
    COUNT(o.order_id) AS total_orders,
    ROUND(SUM(o.total_amount), 2) AS hourly_revenue
FROM orders o
WHERE o.order_status != 'cancelled'
GROUP BY EXTRACT(HOUR FROM o.created_at)
ORDER BY total_orders DESC;


-- ----------------------------------------------------------------------------
-- Query 2: Cancellation Rate
-- DBMS Concepts: COUNT, CASE
-- Calculates the percentage of orders cancelled across the platform.
-- ----------------------------------------------------------------------------
SELECT 
    COUNT(*) AS total_orders_placed,
    COUNT(CASE WHEN order_status = 'cancelled' THEN 1 END) AS cancelled_orders,
    COUNT(CASE WHEN order_status != 'cancelled' THEN 1 END) AS fulfilled_orders,
    ROUND(
        (COUNT(CASE WHEN order_status = 'cancelled' THEN 1 END) * 100.0) / COUNT(*), 
        2
    ) AS cancellation_rate_percentage
FROM orders;


-- ----------------------------------------------------------------------------
-- Query 3: Revenue by Category
-- DBMS Concepts: JOIN, SUM
-- Evaluates which food categories generate the highest income for the canteen.
-- ----------------------------------------------------------------------------
SELECT 
    c.category_name,
    COUNT(DISTINCT o.order_id) AS unique_orders,
    SUM(oi.quantity) AS total_items_sold,
    ROUND(SUM(oi.subtotal), 2) AS category_revenue
FROM categories c
JOIN menu_items m ON c.category_id = m.category_id
JOIN order_items oi ON m.item_id = oi.item_id
JOIN orders o ON oi.order_id = o.order_id
WHERE o.order_status != 'cancelled'
GROUP BY c.category_id, c.category_name
ORDER BY category_revenue DESC;


-- ----------------------------------------------------------------------------
-- Query 4: Most Active Students (Top Customers)
-- DBMS Concepts: GROUP BY, ORDER BY
-- Identifies the most loyal patrons for student rewards or meal plan perks.
-- ----------------------------------------------------------------------------
SELECT 
    u.user_id,
    u.full_name,
    u.email,
    u.student_id,
    COUNT(o.order_id) AS total_orders_placed,
    ROUND(SUM(o.total_amount), 2) AS lifetime_expenditure
FROM users u
JOIN orders o ON u.user_id = o.user_id
WHERE o.order_status != 'cancelled'
GROUP BY u.user_id, u.full_name, u.email, u.student_id
ORDER BY total_orders_placed DESC, lifetime_expenditure DESC
LIMIT 10;


-- ----------------------------------------------------------------------------
-- Query 5: Top 5 Food Items
-- DBMS Concepts: DENSE_RANK, Window Functions, Subquery / CTE
-- Retrieves strictly the top 5 highest-selling menu items.
-- ----------------------------------------------------------------------------
WITH RankedItems AS (
    SELECT 
        m.item_id,
        m.item_name,
        m.price,
        c.category_name,
        SUM(oi.quantity) AS units_sold,
        ROUND(SUM(oi.subtotal), 2) AS total_sales,
        DENSE_RANK() OVER (ORDER BY SUM(oi.quantity) DESC) AS sales_rank
    FROM menu_items m
    JOIN categories c ON m.category_id = c.category_id
    JOIN order_items oi ON m.item_id = oi.item_id
    JOIN orders o ON oi.order_id = o.order_id
    WHERE o.order_status != 'cancelled'
    GROUP BY m.item_id, m.item_name, m.price, c.category_name
)
SELECT 
    sales_rank,
    item_name,
    category_name,
    price,
    units_sold,
    total_sales
FROM RankedItems
WHERE sales_rank <= 5
ORDER BY sales_rank ASC;
