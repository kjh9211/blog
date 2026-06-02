import express from 'express';
import * as publicController from '../controllers/publicController.js';

const router = express.Router();

router.get('/posts', publicController.listPosts);
router.get('/posts/:slug', publicController.getPost);

export default router;
