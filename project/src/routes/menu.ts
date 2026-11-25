import { Router, Request, Response } from 'express';
import pool from '../lib/mysql';
import { mapMenuItem } from '../lib/menuHelpers'; // shared mapping logic

 // reuse mapping logic

const router = Router();

// GET /api/menu - list all available menu items
router.get('/', async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute('SELECT * FROM menu_items WHERE is_available = true');
    // @ts-ignore – rows is any[]
    const items = (rows as any[]).map(mapMenuItem);
    res.json(items);
  } catch (err: any) {
    console.error('Menu fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch menu' });
  }
});

export default router;
