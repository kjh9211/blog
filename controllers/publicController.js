import pool from '../config/db.js';
import { marked } from 'marked';
import hljs from 'highlight.js';

marked.use({ gfm: true, breaks: true });

const renderer = new marked.Renderer();
renderer.code = function ({ text, lang }) {
  const language = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
  const highlighted = hljs.highlight(text, { language }).value;
  return `<pre><code class="hljs language-${language}">${highlighted}</code></pre>`;
};
marked.use({ renderer });

const PAGE_SIZE = 10;

export async function home(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const offset = (page - 1) * PAGE_SIZE;

    const [[{ total }]] = await pool.execute(
      'SELECT COUNT(*) AS total FROM posts WHERE published = 1'
    );
    const totalPages = Math.ceil(total / PAGE_SIZE);

    const [posts] = await pool.execute(
      'SELECT id, title, slug, content_type, LEFT(content, 200) AS excerpt, created_at FROM posts WHERE published = 1 ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [PAGE_SIZE, offset]
    );

    res.render('public/home', { title: '블로그', posts, page, totalPages });
  } catch (err) {
    next(err);
  }
}

export async function post(req, res, next) {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM posts WHERE slug = ? AND published = 1',
      [req.params.slug]
    );
    if (!rows.length) return res.status(404).render('public/404', { title: '404' });

    const p = rows[0];
    p.renderedContent = p.content_type === 'markdown' ? marked(p.content) : p.content;

    res.render('public/post', { title: p.title, post: p });
  } catch (err) {
    next(err);
  }
}

export function about(req, res) {
  res.render('public/about', { title: 'About' });
}
