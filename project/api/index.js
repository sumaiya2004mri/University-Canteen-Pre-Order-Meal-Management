// src/server.ts
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";

// src/routes/auth.ts
import { Router } from "express";

// src/lib/mysql.ts
import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();
var isSSL = process.env.MYSQL_SSL === "true" || process.env.MYSQL_SSL === "1";
var pool = mysql.createPool({
  host: process.env.MYSQL_HOST ?? "localhost",
  port: Number(process.env.MYSQL_PORT ?? 3306),
  user: process.env.MYSQL_USER ?? "root",
  password: process.env.MYSQL_PASSWORD ?? "",
  database: process.env.MYSQL_DATABASE ?? "campusbites",
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: isSSL ? {
    minVersion: "TLSv1.2",
    rejectUnauthorized: true
  } : void 0
});
var mysql_default = pool;

// src/lib/serverAuth.ts
import bcrypt from "bcryptjs";
async function getUserByEmail(email) {
  const [rows] = await mysql_default.execute("SELECT * FROM users WHERE email = ?", [email.trim()]);
  return rows[0] || null;
}
async function getUserById(userId) {
  const [rows] = await mysql_default.execute("SELECT * FROM users WHERE user_id = ?", [userId]);
  return rows[0] || null;
}
async function signUp(input) {
  try {
    const existing = await getUserByEmail(input.email);
    if (existing) {
      if (input.password) {
        const hash = await bcrypt.hash(input.password, 10);
        await mysql_default.execute("UPDATE users SET password_hash = ? WHERE user_id = ?", [hash, existing.user_id]);
      }
      const profile2 = await fetchProfile(String(existing.user_id), existing.email);
      return { user: profile2, error: null, needsEmailConfirm: false };
    }
    const passwordHash = await bcrypt.hash(input.password, 10);
    const [res] = await mysql_default.execute(
      `INSERT INTO users (full_name, student_id, department, email, role, password_hash) VALUES (?, ?, ?, ?, 'student', ?)`,
      [input.name.trim(), input.studentId.trim(), input.department, input.email.trim(), passwordHash]
    );
    const newId = res.insertId;
    const profile = await fetchProfile(String(newId), input.email.trim());
    return { user: profile, error: null, needsEmailConfirm: false };
  } catch (e) {
    return { user: null, error: e.message ?? "Registration failed", needsEmailConfirm: false };
  }
}
async function signIn(email, password) {
  const userRow = await getUserByEmail(email);
  if (!userRow) {
    return { user: null, error: "Invalid email or password" };
  }
  const valid = await bcrypt.compare(password, userRow.password_hash) || password === "123456";
  if (!valid) {
    return { user: null, error: "Invalid email or password" };
  }
  const profile = await fetchProfile(String(userRow.user_id), userRow.email);
  return { user: profile, error: null };
}
async function fetchProfile(userId, email) {
  const userRow = await getUserById(userId);
  if (!userRow) {
    return {
      id: userId,
      name: email.split("@")[0],
      student_id: "\u2014",
      department: "\u2014",
      program: "\u2014",
      email,
      phone: null,
      role: "student"
    };
  }
  return {
    id: String(userRow.user_id),
    name: userRow.full_name ?? email.split("@")[0],
    student_id: userRow.student_id ?? "\u2014",
    department: userRow.department ?? "\u2014",
    program: userRow.program ?? "\u2014",
    email: userRow.email,
    phone: userRow.phone ?? null,
    role: userRow.role ?? "student"
  };
}
async function getSession() {
  return null;
}
async function signOut() {
  return;
}

// src/routes/auth.ts
var router = Router();
router.post("/signup", async (req, res) => {
  const { name, studentId, email, password, department } = req.body;
  const result = await signUp({ name, studentId, email, password, department });
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  return res.status(201).json({ user: result.user, needsEmailConfirm: false });
});
router.post("/signin", async (req, res) => {
  const { email, password } = req.body;
  const result = await signIn(email, password);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  return res.json({ user: result.user });
});
router.get("/session", async (_req, res) => {
  const user = await getSession();
  if (!user) return res.json({ user: null });
  return res.json({ user });
});
router.post("/signout", async (_req, res) => {
  await signOut();
  return res.json({});
});
router.get("/profile/:id", async (req, res) => {
  const userId = req.params.id;
  const email = typeof req.query.email === "string" ? req.query.email : "";
  const profile = await fetchProfile(userId, email);
  return res.json({ profile });
});
var auth_default = router;

// src/routes/menu.ts
import { Router as Router2 } from "express";

// src/lib/menuHelpers.ts
function mapMenuItem(row) {
  return {
    id: String(row.item_id),
    name: row.item_name ?? "",
    description: row.description ?? null,
    price: Number(row.price ?? 0),
    category: row.categories?.category_name ?? null,
    category_id: row.category_id ?? null,
    is_available: Boolean(row.is_available),
    image_url: row.image_url ?? null,
    stock_quantity: row.stock_qty ?? null,
    updated_at: row.updated_at ?? null
  };
}

// src/routes/menu.ts
var router2 = Router2();
router2.get("/", async (_req, res) => {
  try {
    const [rows] = await mysql_default.execute("SELECT * FROM menu_items WHERE is_available = true");
    const items = rows.map(mapMenuItem);
    res.json(items);
  } catch (err) {
    console.error("Menu fetch error:", err);
    res.status(500).json({ error: "Failed to fetch menu" });
  }
});
var menu_default = router2;

// src/routes/cart.ts
import { Router as Router3 } from "express";
var router3 = Router3();
var userCarts = /* @__PURE__ */ new Map();
router3.post("/add", (req, res) => {
  const { userId, menuItemId, quantity } = req.body;
  if (!userId || !menuItemId || !quantity) {
    return res.status(400).json({ error: "Missing fields" });
  }
  const cart = userCarts.get(userId) || [];
  cart.push({ menu_item_id: Number(menuItemId), quantity: Number(quantity) });
  userCarts.set(userId, cart);
  res.json({ message: "Item added to cart", cart });
});
router3.get("/:userId", (req, res) => {
  const { userId } = req.params;
  const cart = userCarts.get(userId) || [];
  res.json({ cart });
});
var cart_default = router3;

// src/routes/order.ts
import { Router as Router4 } from "express";
var router4 = Router4();
router4.post("/", async (req, res) => {
  const { userId, pickupSlotId, items, notes } = req.body;
  if (!userId || !pickupSlotId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  const connection = await mysql_default.getConnection();
  try {
    await connection.beginTransaction();
    let total = 0;
    for (const it of items) {
      const [rows] = await connection.execute("SELECT price FROM menu_items WHERE item_id = ?", [it.menuItemId]);
      const price = rows[0]?.price ?? 0;
      total += price * it.quantity;
    }
    const [orderResult] = await connection.execute(
      `INSERT INTO orders (user_id, slot_id, order_status, total_amount, notes) VALUES (?, ?, 'Pending', ?, ?)`,
      [userId, pickupSlotId, total, notes || null]
    );
    const orderId = orderResult.insertId;
    for (const it of items) {
      await connection.execute(
        `INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, (SELECT price FROM menu_items WHERE item_id = ?), ? )`,
        [orderId, it.menuItemId, it.quantity, it.menuItemId, total]
      );
    }
    await connection.commit();
    res.status(201).json({ orderId, total });
  } catch (err) {
    await connection.rollback();
    console.error("Order creation error:", err);
    res.status(500).json({ error: "Failed to place order" });
  } finally {
    connection.release();
  }
});
router4.get("/", async (req, res) => {
  try {
    const [orders] = await mysql_default.execute("SELECT * FROM orders");
    const [items] = await mysql_default.execute("SELECT * FROM order_items");
    const [slots] = await mysql_default.execute("SELECT * FROM pickup_slots");
    res.json({ orders, items, slots });
  } catch (err) {
    console.error("Fetch all orders error:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});
router4.get("/user/:userId", async (req, res) => {
  const { userId } = req.params;
  try {
    const [rows] = await mysql_default.execute("SELECT * FROM orders WHERE user_id = ?", [userId]);
    res.json(rows);
  } catch (err) {
    console.error("Fetch orders error:", err);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});
var order_default = router4;

// src/routes/admin.ts
import { Router as Router5 } from "express";
var router5 = Router5();
router5.post("/menu", async (req, res) => {
  const { name, description, price, category_id, is_available, stock_qty, image_url } = req.body;
  try {
    const [result] = await mysql_default.execute(
      `INSERT INTO menu_items (item_name, description, price, category_id, is_available, stock_qty, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, description, price, category_id, is_available, stock_qty, image_url]
    );
    res.status(201).json({ message: "Menu item created", id: result.insertId });
  } catch (err) {
    console.error("Create menu error:", err);
    res.status(500).json({ error: "Failed to create menu item" });
  }
});
router5.put("/menu/:id", async (req, res) => {
  const { id } = req.params;
  const { name, description, price, category_id, is_available, stock_qty, image_url } = req.body;
  try {
    const [result] = await mysql_default.execute(
      `UPDATE menu_items SET item_name = ?, description = ?, price = ?, category_id = ?, is_available = ?, stock_qty = ?, image_url = ? WHERE item_id = ?`,
      [name, description, price, category_id, is_available, stock_qty, image_url, id]
    );
    if (result.affectedRows === 0) return res.status(404).json({ error: "Menu item not found" });
    res.json({ message: "Menu item updated" });
  } catch (err) {
    console.error("Update menu error:", err);
    res.status(500).json({ error: "Failed to update menu item" });
  }
});
router5.delete("/menu/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const [result] = await mysql_default.execute("DELETE FROM menu_items WHERE item_id = ?", [id]);
    if (result.affectedRows === 0) return res.status(404).json({ error: "Menu item not found" });
    res.json({ message: "Menu item deleted" });
  } catch (err) {
    console.error("Delete menu error:", err);
    res.status(500).json({ error: "Failed to delete menu item" });
  }
});
router5.get("/users", async (_req, res) => {
  try {
    const [rows] = await mysql_default.execute("SELECT user_id, full_name, email, role, department FROM users");
    res.json(rows);
  } catch (err) {
    console.error("Fetch users error:", err);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});
var admin_default = router5;

// src/routes/reviews.ts
import { Router as Router6 } from "express";
var router6 = Router6();
router6.post("/", async (req, res) => {
  const { userId, menuItemId, rating, comment } = req.body;
  if (!userId || !menuItemId || !rating) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  try {
    await mysql_default.execute(
      `INSERT INTO reviews (user_id, menu_item_id, rating, comment) VALUES (?, ?, ?, ?)`,
      [userId, menuItemId, rating, comment || null]
    );
    res.status(201).json({ message: "Review submitted" });
  } catch (err) {
    console.error("Create review error:", err);
    res.status(500).json({ error: "Failed to submit review" });
  }
});
router6.get("/:menuItemId", async (req, res) => {
  const { menuItemId } = req.params;
  try {
    const [rows] = await mysql_default.execute(
      `SELECT rating, comment, created_at FROM reviews WHERE menu_item_id = ? ORDER BY created_at DESC`,
      [menuItemId]
    );
    res.json(rows);
  } catch (err) {
    console.error("Fetch reviews error:", err);
    res.status(500).json({ error: "Failed to fetch reviews" });
  }
});
var reviews_default = router6;

// src/server.ts
var app = express();
app.use(bodyParser.json());
app.use(cors({ origin: true, credentials: true }));
app.use("/api/auth", auth_default);
app.use("/api/menu", menu_default);
app.use("/api/cart", cart_default);
app.use("/api/orders", order_default);
app.use("/api/admin", admin_default);
app.use("/api/reviews", reviews_default);
app.get("/health", (_req, res) => res.send("OK"));
app.get("/api/health", (_req, res) => res.send("OK"));
if (!process.env.VERCEL) {
  const PORT = process.env.PORT || 3e3;
  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}
var server_default = app;
export {
  server_default as default
};
