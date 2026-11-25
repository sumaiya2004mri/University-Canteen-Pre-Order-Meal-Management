import { Router, Request, Response } from 'express';
import pool from '../lib/mysql';

const router = Router();

// Admin: CRUD for menu items
router.post('/menu', async (req: Request, res: Response) => {
  const { name, description, price, category_id, is_available, stock_qty, image_url } = req.body;
  try {
    const [result] = await pool.execute(
      `INSERT INTO menu_items (item_name, description, price, category_id, is_available, stock_qty, image_url) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, description, price, category_id, is_available, stock_qty, image_url]
    );
    // @ts-ignore
    res.status(201).json({ message: 'Menu item created', id: (result as any).insertId });
  } catch (err: any) {
    console.error('Create menu error:', err);
    res.status(500).json({ error: 'Failed to create menu item' });
  }
});

router.put('/menu/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, price, category_id, is_available, stock_qty, image_url } = req.body;
  try {
    const [result] = await pool.execute(
      `UPDATE menu_items SET item_name = ?, description = ?, price = ?, category_id = ?, is_available = ?, stock_qty = ?, image_url = ? WHERE item_id = ?`,
      [name, description, price, category_id, is_available, stock_qty, image_url, id]
    );
    // @ts-ignore
    if ((result as any).affectedRows === 0) return res.status(404).json({ error: 'Menu item not found' });
    res.json({ message: 'Menu item updated' });
  } catch (err: any) {
    console.error('Update menu error:', err);
    res.status(500).json({ error: 'Failed to update menu item' });
  }
});

router.delete('/menu/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    const [result] = await pool.execute('DELETE FROM menu_items WHERE item_id = ?', [id]);
    // @ts-ignore
    if ((result as any).affectedRows === 0) return res.status(404).json({ error: 'Menu item not found' });
    res.json({ message: 'Menu item deleted' });
  } catch (err: any) {
    console.error('Delete menu error:', err);
    res.status(500).json({ error: 'Failed to delete menu item' });
  }
});

// Admin: list all users
router.get('/users', async (_req: Request, res: Response) => {
  try {
    const [rows] = await pool.execute('SELECT user_id, full_name, email, role, department FROM users');
    // @ts-ignore
    res.json(rows);
  } catch (err: any) {
    console.error('Fetch users error:', err);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

export default router;
