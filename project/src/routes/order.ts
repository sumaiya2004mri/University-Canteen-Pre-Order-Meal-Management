import { Router, Request, Response } from 'express';
import pool from '../lib/mysql';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

/**
 * POST /api/orders - place a new order.
 * Expected body: { userId, pickupSlotId, items: [{ menuItemId, quantity }], notes }
 */
router.post('/', async (req: Request, res: Response) => {
  const { userId, pickupSlotId, items, notes } = req.body;
  if (!userId || !pickupSlotId || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    // Calculate total amount (simplified – assumes price column exists)
    let total = 0;
    for (const it of items) {
      const [rows] = await connection.execute('SELECT price FROM menu_items WHERE item_id = ?', [it.menuItemId]);
      // @ts-ignore
      const price = rows[0]?.price ?? 0;
      total += price * it.quantity;
    }
    const [orderResult] = await connection.execute(
      `INSERT INTO orders (user_id, slot_id, order_status, total_amount, notes) VALUES (?, ?, 'Pending', ?, ?)`,
      [userId, pickupSlotId, total, notes || null]
    );
    // @ts-ignore
    const orderId = (orderResult as any).insertId;
    // Insert order items
    for (const it of items) {
      await connection.execute(
        `INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, subtotal) VALUES (?, ?, ?, (SELECT price FROM menu_items WHERE item_id = ?), ? )`,
        [orderId, it.menuItemId, it.quantity, it.menuItemId, total]
      );
    }
    await connection.commit();
    res.status(201).json({ orderId, total });
  } catch (err: any) {
    await connection.rollback();
    console.error('Order creation error:', err);
    res.status(500).json({ error: 'Failed to place order' });
  } finally {
    connection.release();
  }
});

/**
 * PATCH /api/orders/:id/status - transition order status.
 * Body: { newStatus }
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const [orders] = await pool.execute('SELECT * FROM orders');
    const [items] = await pool.execute('SELECT * FROM order_items');
    const [slots] = await pool.execute('SELECT * FROM pickup_slots');
    // @ts-ignore
    res.json({ orders, items, slots });
  } catch (err: any) {
    console.error('Fetch all orders error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

/**
 * GET /api/orders/:userId - list user's orders.
 */
router.get('/user/:userId', async (req: Request, res: Response) => {
  const { userId } = req.params;
  try {
    const [rows] = await pool.execute('SELECT * FROM orders WHERE user_id = ?', [userId]);
    // @ts-ignore
    res.json(rows);
  } catch (err: any) {
    console.error('Fetch orders error:', err);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

export default router;
