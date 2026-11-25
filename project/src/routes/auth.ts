import { Router, Request, Response } from 'express';
import { signUp, signIn, getSession, signOut, fetchProfile } from '../lib/serverAuth';
import type { SessionUser } from '@/lib/serverAuth';

const router = Router();

// POST /api/auth/signup
router.post('/signup', async (req: Request, res: Response) => {
  const { name, studentId, email, password, department } = req.body;
  const result = await signUp({ name, studentId, email, password, department });
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  return res.status(201).json({ needsEmailConfirm: result.needsEmailConfirm });
});

// POST /api/auth/signin
router.post('/signin', async (req: Request, res: Response) => {
  const { email, password } = req.body;
  const result = await signIn(email, password);
  if (result.error) {
    return res.status(400).json({ error: result.error });
  }
  // In a real app set a session cookie here; for now just return the user.
  return res.json({ user: result.user });
});

// GET /api/auth/session
router.get('/session', async (_req: Request, res: Response) => {
  const user = await getSession();
  if (!user) return res.json({ user: null });
  return res.json({ user });
});

// POST /api/auth/signout
router.post('/signout', async (_req: Request, res: Response) => {
  await signOut();
  return res.json({});
});

// GET /api/auth/profile/:id
router.get('/profile/:id', async (req: Request, res: Response) => {
  const userId = req.params.id;
  const email = typeof req.query.email === 'string' ? req.query.email : '';
  const profile = await fetchProfile(userId, email);
  return res.json({ profile });
});

export default router;
