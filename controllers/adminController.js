import pool from '../config/db.js';
import { uploadImage } from '../config/upload.js';

function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function uniqueSlug(base, excludeId = null) {
  let slug = base;
  let n = 1;
  while (true) {
    const query = excludeId
      ? 'SELECT id FROM posts WHERE slug = ? AND id != ?'
      : 'SELECT id FROM posts WHERE slug = ?';
    const params = excludeId ? [slug, excludeId] : [slug];
    const [rows] = await pool.execute(query, params);
    if (!rows.length) return slug;
    slug = `${base}-${++n}`;
  }
}

export function me(req, res) {
  res.json({ user: req.user });
}

export async function logout(req, res, next) {
  req.logout(err => {
    if (err) return next(err);
    req.session.destroy(() => res.json({ success: true }));
  });
}

export async function listPosts(req, res, next) {
  try {
    const [posts] = await pool.execute(
      'SELECT id, title, slug, content_type, published, created_at, expires_at FROM posts ORDER BY created_at DESC'
    );
    res.json({ posts });
  } catch (err) {
    next(err);
  }
}

export async function getPost(req, res, next) {
  try {
    const [rows] = await pool.execute('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.status(404).json({ error: '포스트를 찾을 수 없습니다.' });
    res.json({ post: rows[0] });
  } catch (err) {
    next(err);
  }
}

export async function createPost(req, res, next) {
  const { title, content, content_type, published } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: '제목과 내용을 입력해주세요.' });
  }
  try {
    const slug = await uniqueSlug(slugify(title));
    // 테스트 계정이 작성한 글은 5분 후 자동 삭제
    const expiresAt = req.user?.isTest ? new Date(Date.now() + 5 * 60 * 1000) : null;

    const [result] = await pool.execute(
      'INSERT INTO posts (title, slug, content, content_type, published, expires_at) VALUES (?, ?, ?, ?, ?, ?)',
      [title, slug, content, content_type || 'markdown', published ? 1 : 0, expiresAt]
    );
    res.json({ post: { id: result.insertId, slug } });
  } catch (err) {
    next(err);
  }
}

export async function updatePost(req, res, next) {
  const { id } = req.params;
  const { title, content, content_type, published } = req.body;
  if (!title || !content) {
    return res.status(400).json({ error: '제목과 내용을 입력해주세요.' });
  }
  try {
    const slug = await uniqueSlug(slugify(title), id);
    await pool.execute(
      'UPDATE posts SET title = ?, slug = ?, content = ?, content_type = ?, published = ? WHERE id = ?',
      [title, slug, content, content_type || 'markdown', published ? 1 : 0, id]
    );
    res.json({ post: { id, slug } });
  } catch (err) {
    next(err);
  }
}

export async function deletePost(req, res, next) {
  try {
    await pool.execute('DELETE FROM posts WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
}

export function uploadImageHandler(req, res) {
  uploadImage(req, res, err => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: '파일이 없습니다.' });
    res.json({ url: `/uploads/${req.file.filename}` });
  });
}
