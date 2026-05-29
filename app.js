import {configDotenv} from 'dotenv';

configDotenv();

process.on('unhandledRejection', (reason) => {
  console.error('❌ unhandledRejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('❌ uncaughtException:', err);
});

import express from 'express';
import session from 'express-session';
import { fileURLToPath } from 'url';
import path from 'path';
import passport from './config/passport.js';
import { startCleanupJob } from './config/cleanup.js';
import apiRouter from './routes/api.js';
import adminRouter from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pagesDir = path.join(__dirname, 'pages');

const app = express();

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true, maxAge: 1000 * 60 * 60 * 8 },
  })
);

app.use(passport.initialize());
app.use(passport.session());

// 페이지 라우트
app.get('/', (req, res) => res.sendFile(path.join(pagesDir, 'index.html')));
app.get('/about', (req, res) => res.sendFile(path.join(pagesDir, 'about.html')));
app.get('/post/:slug', (req, res) => res.sendFile(path.join(pagesDir, 'post.html')));

// API / 관리자
app.use('/api', apiRouter);
app.use('/admin', adminRouter);

// 404
app.use((req, res) => {
  res.status(404).sendFile(path.join(pagesDir, '404.html'));
});

// 오류
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT || 50080;
const server = app.listen(PORT, () => {
  console.log(`블로그 서버 실행 중: http://localhost:${PORT}`);
  console.log('활성 핸들 수:', process._getActiveHandles().length);
  startCleanupJob();
});

server.on('error', (err) => console.error('❌ 서버 오류:', err));
server.on('close', () => console.error('⚠️  서버가 닫혔습니다.'));
