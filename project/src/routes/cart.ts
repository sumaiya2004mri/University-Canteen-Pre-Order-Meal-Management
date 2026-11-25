import { Router, Request, Response } from 'express';
import pool from '../lib/mysql';


const router = Router();

// In‑memory cart store per user ID (for demo purposes only)
const userCarts = new Map<string, { menu_item_id: number; quantity: number }[]>();

// POST /api/cart/add { userId, menuItemId, quantity }
router.post('/add', (req: Request, res: Response) => {
  const { userId, menuItemId, quantity } = req.body;
  if (!userId || !menuItemId || !quantity) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const cart = userCarts.get(userId) || [];
  cart.push({ menu_item_id: Number(menuItemId), quantity: Number(quantity) });
  userCarts.set(userId, cart);
  res.json({ message: 'Item added to cart', cart });
});

// GET /api/cart/:userId
router.get('/:userId', (req: Request, res: Response) => {
  const { userId } = req.params;
  const cart = userCarts.get(userId) || [];
  res.json({ cart });
});

export default router;
