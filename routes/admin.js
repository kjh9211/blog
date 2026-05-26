import express from 'express';
import passport from '../config/passport.js';
import { requireAuth } from '../middleware/auth.js';
import * as adminController from '../controllers/adminController.js';

const router = express.Router();

// Discord OAuth 2
router.get('/auth/discord', passport.authenticate('discord'));
router.get(
  '/auth/discord/callback',
  passport.authenticate('discord', { failureRedirect: '/admin/auth/discord' }),
  (req, res) => res.redirect('/admin')
);

// Logout
router.post('/logout', requireAuth, adminController.logout);

// Dashboard & post management (all protected)
router.get('/', requireAuth, adminController.dashboard);
router.get('/posts/new', requireAuth, adminController.newPostPage);
router.post('/posts', requireAuth, adminController.createPost);
router.get('/posts/:id/edit', requireAuth, adminController.editPostPage);
router.put('/posts/:id', requireAuth, adminController.updatePost);
router.delete('/posts/:id', requireAuth, adminController.deletePost);

export default router;
