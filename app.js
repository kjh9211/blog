import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import methodOverride from 'method-override';
import { fileURLToPath } from 'url';
import path from 'path';
import passport from './config/passport.js';
import publicRouter from './routes/public.js';
import adminRouter from './routes/admin.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride('_method'));

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

app.use('/', publicRouter);
app.use('/admin', adminRouter);

app.use((req, res) => {
  res.status(404).render('public/404', { title: '404 Not Found' });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render('public/error', { title: '서버 오류', message: err.message });
});

const PORT = process.env.PORT || 50080;
app.listen(PORT, () => console.log(`블로그 서버 실행 중: http://localhost:${PORT}`));
