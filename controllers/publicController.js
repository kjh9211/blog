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

export async function listPosts(req, res, next) {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const offset = (page - 1) * PAGE_SIZE;

    const [[{ total }]] = await pool.execute(
      'SELECT COUNT(*) AS total FROM posts WHERE published = 1 AND (expires_at IS NULL OR expires_at > NOW())'
    );
    const totalPages = Math.ceil(total / PAGE_SIZE);

    const [posts] = await pool.execute(
      `SELECT id, title, slug, content_type, LEFT(content, 200) AS excerpt, created_at
       FROM posts
       WHERE published = 1 AND (expires_at IS NULL OR expires_at > NOW())
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      [PAGE_SIZE, offset]
    );

    res.json({ posts, page, totalPages });
  } catch (err) {
    next(err);
  }
}

export async function getPost(req, res, next) {
  try {
    const [rows] = await pool.execute(
      'SELECT * FROM posts WHERE slug = ? AND published = 1 AND (expires_at IS NULL OR expires_at > NOW())',
      [req.params.slug]
    );
    if (!rows.length) return res.status(404).json({ error: '포스트를 찾을 수 없습니다.' });

    const post = rows[0];
    post.renderedContent = post.content_type === 'markdown' ? marked(post.content) : post.content;

    res.json({ post });
  } catch (err) {
    next(err);
  }
}
