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

export async function logout(req, res, next) {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy(() => res.redirect('/admin/auth/discord'));
  });
}

export async function dashboard(req, res, next) {
  try {
    const [posts] = await pool.execute(
      'SELECT id, title, slug, content_type, published, created_at FROM posts ORDER BY created_at DESC'
    );
    res.render('admin/dashboard', { title: '관리자 대시보드', posts });
  } catch (err) {
    next(err);
  }
}

export function newPostPage(req, res) {
  res.render('admin/post-form', {
    title: '새 포스트',
    post: null,
    action: '/admin/posts',
    method: 'POST',
    error: null,
  });
}

export async function createPost(req, res, next) {
  const { title, content, content_type, published } = req.body;
  if (!title || !content) {
    return res.render('admin/post-form', {
      title: '새 포스트',
      post: req.body,
      action: '/admin/posts',
      method: 'POST',
      error: '제목과 내용을 입력해주세요.',
    });
  }
  try {
    const slug = await uniqueSlug(slugify(title));
    await pool.execute(
      'INSERT INTO posts (title, slug, content, content_type, published) VALUES (?, ?, ?, ?, ?)',
      [title, slug, content, content_type || 'markdown', published ? 1 : 0]
    );
    res.redirect('/admin');
  } catch (err) {
    next(err);
  }
}

export async function editPostPage(req, res, next) {
  try {
    const [rows] = await pool.execute('SELECT * FROM posts WHERE id = ?', [req.params.id]);
    if (!rows.length) return res.redirect('/admin');
    const post = rows[0];
    res.render('admin/post-form', {
      title: '포스트 수정',
      post,
      action: `/admin/posts/${post.id}?_method=PUT`,
      method: 'POST',
      error: null,
    });
  } catch (err) {
    next(err);
  }
}

export async function updatePost(req, res, next) {
  const { id } = req.params;
  const { title, content, content_type, published } = req.body;
  if (!title || !content) {
    return res.render('admin/post-form', {
      title: '포스트 수정',
      post: { ...req.body, id },
      action: `/admin/posts/${id}?_method=PUT`,
      method: 'POST',
      error: '제목과 내용을 입력해주세요.',
    });
  }
  try {
    const slug = await uniqueSlug(slugify(title), id);
    await pool.execute(
      'UPDATE posts SET title = ?, slug = ?, content = ?, content_type = ?, published = ? WHERE id = ?',
      [title, slug, content, content_type || 'markdown', published ? 1 : 0, id]
    );
    res.redirect('/admin');
  } catch (err) {
    next(err);
  }
}

export async function deletePost(req, res, next) {
  try {
    await pool.execute('DELETE FROM posts WHERE id = ?', [req.params.id]);
    res.redirect('/admin');
  } catch (err) {
    next(err);
  }
}

export function uploadImageHandler(req, res) {
  uploadImage(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    if (!req.file) return res.status(400).json({ error: '파일이 없습니다.' });
    res.json({ url: `/uploads/${req.file.filename}` });
  });
}
