import express from 'express';
import * as publicController from '../controllers/publicController.js';

const router = express.Router();

router.get('/', publicController.home);
router.get('/about', publicController.about);
router.get('/post/:slug', publicController.post);

export default router;
