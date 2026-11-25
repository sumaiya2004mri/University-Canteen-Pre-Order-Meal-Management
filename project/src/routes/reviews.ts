import { Router, Request, Response } from 'express';
import pool from '../lib/mysql';


const router = Router();

// POST /api/reviews - create a review (student only)
router.post('/', async (req: Request, res: Response) => {
  const { userId, menuItemId, rating, comment } = req.body;
  if (!userId || !menuItemId || !rating) {
    return res.status(400).json({ error: 'Missing required fields' });
  }
  try {
    await pool.execute(
      `INSERT INTO reviews (user_id, menu_item_id, rating, comment) VALUES (?, ?, ?, ?)`,
      [userId, menuItemId, rating, comment || null]
    );
    res.status(201).json({ message: 'Review submitted' });
  } catch (err: any) {
    console.error('Create review error:', err);
    res.status(500).json({ error: 'Failed to submit review' });
  }
});

// GET /api/reviews/:menuItemId - fetch reviews for a menu item
router.get('/:menuItemId', async (req: Request, res: Response) => {
  const { menuItemId } = req.params;
  try {
    const [rows] = await pool.execute(
      `SELECT rating, comment, created_at FROM reviews WHERE menu_item_id = ? ORDER BY created_at DESC`,
      [menuItemId]
    );
    // @ts-ignore
    res.json(rows);
  } catch (err: any) {
    console.error('Fetch reviews error:', err);
    res.status(500).json({ error: 'Failed to fetch reviews' });
  }
});

export default router;
