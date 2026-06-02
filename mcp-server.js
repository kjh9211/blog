import 'dotenv/config';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import pool from './config/db.js';
import { marked } from 'marked';

// ── 슬러그 유틸 ───────────────────────────────────────────────
function slugify(text) {
  return text.toLowerCase().trim()
    .replace(/[^a-z0-9가-힣\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

async function uniqueSlug(base, excludeId = null) {
  let slug = base, n = 1;
  while (true) {
    const q = excludeId
      ? 'SELECT id FROM posts WHERE slug = ? AND id != ?'
      : 'SELECT id FROM posts WHERE slug = ?';
    const [rows] = await pool.execute(q, excludeId ? [slug, excludeId] : [slug]);
    if (!rows.length) return slug;
    slug = `${base}-${++n}`;
  }
}

// ── 도구 목록 ─────────────────────────────────────────────────
const TOOLS = [
  {
    name: 'list_posts',
    description: '블로그 포스트 목록을 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        filter: {
          type: 'string',
          enum: ['all', 'published', 'draft'],
          description: '공개 상태 필터 (기본: all)',
        },
        limit: {
          type: 'integer',
          minimum: 1,
          maximum: 100,
          description: '최대 조회 수 (기본: 20)',
        },
      },
    },
  },
  {
    name: 'get_post',
    description: 'ID 또는 슬러그로 포스트를 상세 조회합니다.',
    inputSchema: {
      type: 'object',
      properties: {
        id:   { type: 'integer', description: '포스트 ID' },
        slug: { type: 'string',  description: '포스트 슬러그' },
      },
    },
  },
  {
    name: 'create_post',
    description: '새 포스트를 작성합니다.',
    inputSchema: {
      type: 'object',
      required: ['title', 'content'],
      properties: {
        title:        { type: 'string', description: '제목' },
        content:      { type: 'string', description: '본문 (마크다운 또는 HTML)' },
        content_type: { type: 'string', enum: ['markdown', 'html'], description: '형식 (기본: markdown)' },
        published:    { type: 'boolean', description: '공개 여부 (기본: false)' },
      },
    },
  },
  {
    name: 'update_post',
    description: '기존 포스트를 수정합니다. 전달한 필드만 변경됩니다.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id:           { type: 'integer', description: '수정할 포스트 ID' },
        title:        { type: 'string' },
        content:      { type: 'string' },
        content_type: { type: 'string', enum: ['markdown', 'html'] },
        published:    { type: 'boolean' },
      },
    },
  },
  {
    name: 'delete_post',
    description: '포스트를 삭제합니다.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'integer', description: '삭제할 포스트 ID' },
      },
    },
  },
  {
    name: 'toggle_publish',
    description: '포스트 공개/비공개 상태를 전환합니다.',
    inputSchema: {
      type: 'object',
      required: ['id'],
      properties: {
        id: { type: 'integer', description: '포스트 ID' },
      },
    },
  },
];

// ── 도구 핸들러 ───────────────────────────────────────────────
async function handleTool(name, args = {}) {
  switch (name) {

    case 'list_posts': {
      const filter = args.filter ?? 'all';
      const limit  = args.limit  ?? 20;
      const where  = filter === 'published' ? 'WHERE published = 1'
                   : filter === 'draft'     ? 'WHERE published = 0'
                   : '';
      const [posts] = await pool.execute(
        `SELECT id, title, slug, content_type, published, created_at, expires_at
         FROM posts ${where} ORDER BY created_at DESC LIMIT ?`,
        [limit]
      );
      return text(JSON.stringify(posts, null, 2));
    }

    case 'get_post': {
      const { id, slug } = args;
      if (!id && !slug) throw new Error('id 또는 slug 중 하나가 필요합니다.');
      const [rows] = id
        ? await pool.execute('SELECT * FROM posts WHERE id = ?', [id])
        : await pool.execute('SELECT * FROM posts WHERE slug = ?', [slug]);
      if (!rows.length) throw new Error('포스트를 찾을 수 없습니다.');
      const post = rows[0];
      if (post.content_type === 'markdown') post.renderedHtml = marked(post.content);
      return text(JSON.stringify(post, null, 2));
    }

    case 'create_post': {
      const { title, content, content_type = 'markdown', published = false } = args;
      if (!title || !content) throw new Error('title과 content는 필수입니다.');
      const slug = await uniqueSlug(slugify(title));
      const [result] = await pool.execute(
        'INSERT INTO posts (title, slug, content, content_type, published) VALUES (?, ?, ?, ?, ?)',
        [title, slug, content, content_type, published ? 1 : 0]
      );
      return text(JSON.stringify({ id: result.insertId, slug, created: true }));
    }

    case 'update_post': {
      const { id, title, content, content_type, published } = args;
      if (!id) throw new Error('id가 필요합니다.');
      const [rows] = await pool.execute('SELECT * FROM posts WHERE id = ?', [id]);
      if (!rows.length) throw new Error('포스트를 찾을 수 없습니다.');
      const p = rows[0];
      const newTitle     = title        ?? p.title;
      const newContent   = content      ?? p.content;
      const newType      = content_type ?? p.content_type;
      const newPublished = published !== undefined ? (published ? 1 : 0) : p.published;
      const newSlug      = title ? await uniqueSlug(slugify(newTitle), id) : p.slug;
      await pool.execute(
        'UPDATE posts SET title=?, slug=?, content=?, content_type=?, published=? WHERE id=?',
        [newTitle, newSlug, newContent, newType, newPublished, id]
      );
      return text(JSON.stringify({ id, slug: newSlug, updated: true }));
    }

    case 'delete_post': {
      const { id } = args;
      if (!id) throw new Error('id가 필요합니다.');
      const [result] = await pool.execute('DELETE FROM posts WHERE id = ?', [id]);
      if (!result.affectedRows) throw new Error('포스트를 찾을 수 없습니다.');
      return text(JSON.stringify({ id, deleted: true }));
    }

    case 'toggle_publish': {
      const { id } = args;
      if (!id) throw new Error('id가 필요합니다.');
      const [rows] = await pool.execute('SELECT id, published FROM posts WHERE id = ?', [id]);
      if (!rows.length) throw new Error('포스트를 찾을 수 없습니다.');
      const next = rows[0].published ? 0 : 1;
      await pool.execute('UPDATE posts SET published=? WHERE id=?', [next, id]);
      return text(JSON.stringify({ id, published: !!next }));
    }

    default:
      throw new Error(`알 수 없는 도구: ${name}`);
  }
}

function text(str) {
  return { content: [{ type: 'text', text: str }] };
}

// ── 서버 초기화 ───────────────────────────────────────────────
const server = new Server(
  { name: 'dev-blog', version: '1.0.0' },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    return await handleTool(name, args);
  } catch (err) {
    return { isError: true, content: [{ type: 'text', text: `오류: ${err.message}` }] };
  }
});

const transport = new StdioServerTransport();
await server.connect(transport);
