# University Canteen Pre-Order System — Final Database Schema

## 1. Overview & Architectural Decisions

This database schema is designed for **PostgreSQL (via Supabase)** following **Third Normal Form (3NF)** principles while accounting for real-world transactional integrity.

### Key Design Decisions
1. **Supabase Authentication Integration (`auth.users`):**
   * Supabase natively manages user authentication, passwords, and sessions in its internal `auth.users` table.
   * Instead of building a redundant authentication system, our `public.users` table acts as an application profile table where `user_id` is both the **Primary Key** and a **Foreign Key** referencing `auth.users(id)` (`ON DELETE CASCADE`).
2. **Historical Price Preservation (`order_items.unit_price`):**
   * Menu prices fluctuate over time (e.g., a burger priced at `৳100` today may rise to `৳120` next week).
   * Storing `unit_price` inside `order_items` captures a point-in-time snapshot of the item's price at checkout. This is an intentional audit/historical preservation design rather than a transitive dependency violation.
3. **Inventory & Capacity Control:**
   * `menu_items.stock_qty` tracks real-time available portions to prevent overselling.
   * `pickup_slots.max_orders` limits how many orders can be scheduled within a specific time window to prevent canteen rush bottlenecks.
   * `orders.cancelled_at` records the exact timestamp when an order is cancelled for audit and refund tracking.

---

## 2. Entity-Relationship Summary

| Table | Primary Key | Foreign Keys | Description |
| :--- | :--- | :--- | :--- |
| **`users`** | `user_id` | `user_id` $\rightarrow$ `auth.users(id)` | Student, faculty, staff, and admin profiles linked to Supabase Auth. |
| **`categories`** | `category_id` | — | Food & beverage groupings (e.g., Breakfast, Lunch, Snacks). |
| **`menu_items`** | `item_id` | `category_id` $\rightarrow$ `categories(category_id)` | Canteen food items, pricing, availability, and stock count. |
| **`pickup_slots`** | `slot_id` | — | Scheduled collection windows with maximum order capacity. |
| **`orders`** | `order_id` | `user_id` $\rightarrow$ `users(user_id)`<br>`slot_id` $\rightarrow$ `pickup_slots(slot_id)` | Pre-order header tracking status, total cost, and timestamps. |
| **`order_items`** | `order_item_id` | `order_id` $\rightarrow$ `orders(order_id)`<br>`item_id` $\rightarrow$ `menu_items(item_id)` | Line items per order with quantity and historical `unit_price`. |
| **`payments`** | `payment_id` | `order_id` $\rightarrow$ `orders(order_id)` (`UNIQUE`) | `1:1` payment record tracking method, status, and payment time. |

---

## 3. Detailed Table Specifications

### 3.1 `users` (Profile Table)
| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `user_id` | `uuid` | `PRIMARY KEY`, `REFERENCES auth.users(id) ON DELETE CASCADE` | Matches Supabase Auth user UUID |
| `name` | `varchar(100)` | `NOT NULL` | Full name of the user |
| `email` | `varchar(150)` | `UNIQUE`, `NOT NULL` | University or personal email |
| `student_id` | `varchar(30)` | `UNIQUE` | University ID (nullable for external/non-student staff if needed) |
| `role` | `varchar(20)` | `NOT NULL`, `DEFAULT 'student'`, `CHECK (role IN ('student', 'faculty', 'staff', 'admin'))` | Access and ordering role |

### 3.2 `categories`
| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `category_id` | `serial` | `PRIMARY KEY` | Auto-incrementing category identifier |
| `name` | `varchar(50)` | `UNIQUE`, `NOT NULL` | Category title (e.g., Meals, Drinks, Snacks) |

### 3.3 `menu_items`
| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `item_id` | `serial` | `PRIMARY KEY` | Auto-incrementing menu item identifier |
| `category_id` | `integer` | `NOT NULL`, `REFERENCES categories(category_id) ON DELETE RESTRICT` | Category the item belongs to |
| `name` | `varchar(100)` | `NOT NULL` | Name of the food or drink item |
| `price` | `numeric(10, 2)` | `NOT NULL`, `CHECK (price >= 0)` | Current selling price in BDT (`৳`) |
| `is_available` | `boolean` | `NOT NULL`, `DEFAULT true` | Manual toggle for item visibility/availability |
| `stock_qty` | `integer` | `NOT NULL`, `DEFAULT 0`, `CHECK (stock_qty >= 0)` | Remaining portions available for pre-order |

### 3.4 `pickup_slots`
| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `slot_id` | `serial` | `PRIMARY KEY` | Auto-incrementing slot identifier |
| `slot_date` | `date` | `NOT NULL` | Calendar date of pickup |
| `start_time` | `time` | `NOT NULL` | Pickup window start time |
| `end_time` | `time` | `NOT NULL`, `CHECK (end_time > start_time)` | Pickup window end time |
| `max_orders` | `integer` | `NOT NULL`, `DEFAULT 30`, `CHECK (max_orders > 0)` | Maximum orders allowed in this slot |
| *Table Constraint* | — | `UNIQUE (slot_date, start_time, end_time)` | Prevents duplicate time slots on the same date |

### 3.5 `orders`
| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `order_id` | `uuid` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Unique order identifier |
| `user_id` | `uuid` | `NOT NULL`, `REFERENCES users(user_id) ON DELETE RESTRICT` | User who placed the order |
| `slot_id` | `integer` | `NOT NULL`, `REFERENCES pickup_slots(slot_id) ON DELETE RESTRICT` | Selected pickup window |
| `status` | `varchar(20)` | `NOT NULL`, `DEFAULT 'pending'`, `CHECK (status IN ('pending', 'confirmed', 'preparing', 'ready', 'picked_up', 'cancelled'))` | Current lifecycle state of the order |
| `total_amount` | `numeric(10, 2)` | `NOT NULL`, `CHECK (total_amount >= 0)` | Total payable amount for the order |
| `created_at` | `timestamptz` | `NOT NULL`, `DEFAULT now()` | Timestamp when the order was placed |
| `cancelled_at` | `timestamptz` | `NULL` | Timestamp when the order was cancelled (if applicable) |

### 3.6 `order_items`
| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `order_item_id` | `serial` | `PRIMARY KEY` | Auto-incrementing line item identifier |
| `order_id` | `uuid` | `NOT NULL`, `REFERENCES orders(order_id) ON DELETE CASCADE` | Parent order reference |
| `item_id` | `integer` | `NOT NULL`, `REFERENCES menu_items(item_id) ON DELETE RESTRICT` | Ordered menu item reference |
| `quantity` | `integer` | `NOT NULL`, `CHECK (quantity > 0)` | Number of units ordered |
| `unit_price` | `numeric(10, 2)` | `NOT NULL`, `CHECK (unit_price >= 0)` | Historical price per unit at the time of order |
| *Table Constraint* | — | `UNIQUE (order_id, item_id)` | Combines duplicate items into a single line per order |

### 3.7 `payments`
| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `payment_id` | `uuid` | `PRIMARY KEY`, `DEFAULT gen_random_uuid()` | Unique payment identifier |
| `order_id` | `uuid` | `UNIQUE`, `NOT NULL`, `REFERENCES orders(order_id) ON DELETE CASCADE` | Enforces `1:1` relationship with `orders` |
| `method` | `varchar(30)` | `NOT NULL`, `CHECK (method IN ('bkash', 'nagad', 'card', 'cash_on_pickup'))` | Payment method used |
| `status` | `varchar(20)` | `NOT NULL`, `DEFAULT 'pending'`, `CHECK (status IN ('pending', 'completed', 'failed', 'refunded'))` | Payment transaction status |
| `paid_at` | `timestamptz` | `NULL` | Timestamp when payment was confirmed |

---

## 4. Relationships & Cardinality

1. **`auth.users` $\rightarrow$ `public.users` (`1:1`):** Every registered Supabase Auth account maps to one profile row in `public.users`.
2. **`categories` $\rightarrow$ `menu_items` (`1:N`):** One category organizes multiple menu items; each menu item belongs to one category.
3. **`users` $\rightarrow$ `orders` (`1:N`):** One user can place many pre-orders; each order belongs to one user.
4. **`pickup_slots` $\rightarrow$ `orders` (`1:N`):** One pickup slot holds many orders (up to `max_orders`); each order is scheduled for one pickup slot.
5. **`orders` $\rightarrow$ `order_items` (`1:N`):** One order contains one or more line items.
6. **`menu_items` $\rightarrow$ `order_items` (`1:N`):** One menu item can appear across many historical order line items.
7. **`orders` $\leftrightarrow$ `payments` (`1:1`):** Each order has exactly one payment record enforced by the `UNIQUE` constraint on `payments.order_id`.

---

## 5. Updated DBML Diagram (`dbdiagram.io`)

```dbml
// University Canteen Pre-Order System - Finalized Schema (PostgreSQL / Supabase)

Table auth.users {
  id uuid [pk]
}

Table users {
  user_id uuid [pk, note: 'References auth.users(id)']
  name varchar(100) [not null]
  email varchar(150) [unique, not null]
  student_id varchar(30) [unique]
  role varchar(20) [not null, default: 'student']
}

Table categories {
  category_id serial [pk]
  name varchar(50) [unique, not null]
}

Table menu_items {
  item_id serial [pk]
  category_id integer [not null]
  name varchar(100) [not null]
  price numeric(10, 2) [not null]
  is_available boolean [not null, default: true]
  stock_qty integer [not null, default: 0]
}

Table pickup_slots {
  slot_id serial [pk]
  slot_date date [not null]
  start_time time [not null]
  end_time time [not null]
  max_orders integer [not null, default: 30]

  indexes {
    (slot_date, start_time, end_time) [unique]
  }
}

Table orders {
  order_id uuid [pk, default: `gen_random_uuid()`]
  user_id uuid [not null]
  slot_id integer [not null]
  status varchar(20) [not null, default: 'pending']
  total_amount numeric(10, 2) [not null]
  created_at timestamptz [not null, default: `now()`]
  cancelled_at timestamptz
}

Table order_items {
  order_item_id serial [pk]
  order_id uuid [not null]
  item_id integer [not null]
  quantity integer [not null]
  unit_price numeric(10, 2) [not null, note: 'Historical price snapshot']

  indexes {
    (order_id, item_id) [unique]
  }
}

Table payments {
  payment_id uuid [pk, default: `gen_random_uuid()`]
  order_id uuid [unique, not null]
  method varchar(30) [not null]
  status varchar(20) [not null, default: 'pending']
  paid_at timestamptz
}

// Relationships
Ref: auth.users.id - users.user_id
Ref: categories.category_id < menu_items.category_id
Ref: users.user_id < orders.user_id
Ref: pickup_slots.slot_id < orders.slot_id
Ref: orders.order_id < order_items.order_id
Ref: menu_items.item_id < order_items.item_id
Ref: orders.order_id - payments.order_id
```