import express from 'express';
import { fileURLToPath } from 'url';
import path from 'path';
import passport from '../config/passport.js';
import { requireAuth, requireAuthApi } from '../middleware/auth.js';
import * as adminController from '../controllers/adminController.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagesDir = path.join(__dirname, '../pages/admin');

const router = express.Router();

// --- OAuth (Discord) ---
router.get('/auth/discord', passport.authenticate('discord'));
router.get(
  '/auth/discord/callback',
  passport.authenticate('discord', { failureRedirect: '/admin/login' }),
  (req, res) => res.redirect('/admin')
);

// --- Local 로그인 (테스트 계정) ---
router.post('/auth/local', (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) return next(err);
    if (!user) return res.status(401).json({ error: info?.message || '로그인 실패' });
    req.logIn(user, err => {
      if (err) return next(err);
      res.json({ success: true });
    });
  })(req, res, next);
});

// --- 페이지 ---
router.get('/login', (req, res) => res.sendFile(path.join(pagesDir, 'login.html')));
router.get('/', requireAuth, (req, res) => res.sendFile(path.join(pagesDir, 'index.html')));
router.get('/posts/new', requireAuth, (req, res) => res.sendFile(path.join(pagesDir, 'post-form.html')));
router.get('/posts/:id/edit', requireAuth, (req, res) => res.sendFile(path.join(pagesDir, 'post-form.html')));

// --- API ---
router.get('/api/me', requireAuthApi, adminController.me);
router.post('/api/logout', requireAuthApi, adminController.logout);
router.post('/api/upload/image', requireAuthApi, adminController.uploadImageHandler);
router.get('/api/posts', requireAuthApi, adminController.listPosts);
router.get('/api/posts/:id', requireAuthApi, adminController.getPost);
router.post('/api/posts', requireAuthApi, adminController.createPost);
router.put('/api/posts/:id', requireAuthApi, adminController.updatePost);
router.delete('/api/posts/:id', requireAuthApi, adminController.deletePost);

export default router;
