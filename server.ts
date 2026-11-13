import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { db } from './server/db.ts';
import { verifyAdminCredentials, signAdminToken, verifyAdminToken } from './server/auth.ts';

const PORT = 3000;

async function startServer() {
  await db.init();

  const app = express();
  app.use(express.json({ limit: '2mb' }));

  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
    const payload = token ? verifyAdminToken(token) : null;
    if (!payload) {
      res.status(401).json({ error: 'Unauthorized. Please sign in to the Admin Dashboard.' });
      return;
    }
    (req as Request & { adminUser?: string }).adminUser = payload.username;
    next();
  };

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  // Public site configuration
  app.get('/api/settings/public', async (_req, res) => {
    try {
      const settings = await db.getPublicSettings();
      res.json(settings);
    } catch {
      res.status(500).json({ error: 'Failed to load site settings' });
    }
  });

  // Public categories with counts
  app.get('/api/categories', async (_req, res) => {
    try {
      const categories = await db.listCategories(true);
      res.json(categories);
    } catch {
      res.status(500).json({ error: 'Failed to load categories' });
    }
  });

  // Public entries (published only)
  app.get('/api/entries', async (req, res) => {
    try {
      const { type, category, q, sort, featured } = req.query;
      const entries = await db.listEntries({
        type: typeof type === 'string' ? type : undefined,
        category: typeof category === 'string' ? category : undefined,
        q: typeof q === 'string' ? q : undefined,
        sort: typeof sort === 'string' ? sort : undefined,
        featured: featured === 'true',
        includeAllStatuses: false,
      });
      res.json(entries);
    } catch {
      res.status(500).json({ error: 'Failed to load entries' });
    }
  });

  // Single published entry + comments
  app.get('/api/entries/:slugOrId', async (req, res) => {
    try {
      const entry = await db.getEntryBySlugOrId(req.params.slugOrId, true);
      if (!entry || entry.status !== 'published') {
        res.status(404).json({ error: 'Article or tip not found' });
        return;
      }
      const comments = await db.listCommentsForEntry(entry.id, true);
      res.json({ entry, comments });
    } catch {
      res.status(500).json({ error: 'Failed to load entry' });
    }
  });

  // Community submit (Blog post or Trick & Tip)
  app.post('/api/entries/submit', async (req, res) => {
    try {
      const {
        type,
        title,
        excerpt,
        content,
        steps,
        codeSnippet,
        snippetLanguage,
        category,
        author,
        difficulty,
        coverImage,
      } = req.body || {};

      if (!title || typeof title !== 'string' || title.trim().length < 4) {
        res.status(400).json({ error: 'Please provide a descriptive title (at least 4 characters).' });
        return;
      }
      if (!content || typeof content !== 'string' || content.trim().length < 15) {
        res.status(400).json({ error: 'Please provide the full content or explanation.' });
        return;
      }
      if (!category || typeof category !== 'string') {
        res.status(400).json({ error: 'Please select a category.' });
        return;
      }

      const settings = await db.getPublicSettings();
      const status = settings.requireApproval ? 'pending' : 'published';
      const entryType = type === 'tip' ? 'tip' : 'blog';
      const cleanExcerpt =
        typeof excerpt === 'string' && excerpt.trim()
          ? excerpt.trim()
          : content.trim().split('\n')[0].slice(0, 160);

      const entry = await db.createEntry({
        type: entryType,
        title,
        excerpt: cleanExcerpt,
        content,
        steps: Array.isArray(steps) ? steps : undefined,
        codeSnippet: typeof codeSnippet === 'string' ? codeSnippet : undefined,
        snippetLanguage: typeof snippetLanguage === 'string' ? snippetLanguage : undefined,
        category,
        author: typeof author === 'string' && author.trim() ? author.trim() : 'Community Contributor',
        difficulty:
          difficulty === 'Intermediate' || difficulty === 'Advanced' ? difficulty : 'Beginner',
        coverImage: typeof coverImage === 'string' && coverImage.trim() ? coverImage : undefined,
        status,
        featured: false,
      });

      res.status(201).json({ entry, status });
    } catch {
      res.status(500).json({ error: 'Failed to save submission' });
    }
  });

  // Upvote entry
  app.post('/api/entries/:id/upvote', async (req, res) => {
    try {
      const updated = await db.incrementEntryCounter(req.params.id, 'upvotes');
      if (!updated) {
        res.status(404).json({ error: 'Entry not found' });
        return;
      }
      res.json({ upvotes: updated.upvotes });
    } catch {
      res.status(500).json({ error: 'Failed to record upvote' });
    }
  });

  // Track snippet copy on tricks & tips
  app.post('/api/entries/:id/copy', async (req, res) => {
    try {
      const updated = await db.incrementEntryCounter(req.params.id, 'copies');
      if (!updated) {
        res.status(404).json({ error: 'Entry not found' });
        return;
      }
      res.json({ copies: updated.copies });
    } catch {
      res.status(500).json({ error: 'Failed to track copy' });
    }
  });

  // Post a reader comment
  app.post('/api/entries/:id/comments', async (req, res) => {
    try {
      const { author, body } = req.body || {};
      if (!body || typeof body !== 'string' || body.trim().length < 2) {
        res.status(400).json({ error: 'Comment cannot be empty.' });
        return;
      }
      const comment = await db.addComment(
        req.params.id,
        typeof author === 'string' && author.trim() ? author.trim() : 'Reader',
        body
      );
      if (!comment) {
        res.status(404).json({ error: 'Article not found' });
        return;
      }
      const comments = await db.listCommentsForEntry(comment.entryId, true);
      res.status(201).json({ comment, comments });
    } catch {
      res.status(500).json({ error: 'Failed to post comment' });
    }
  });

  // ========================
  // ADMIN AUTH & DASHBOARD
  // ========================
  app.post('/api/admin/login', (req, res) => {
    const { username, password } = req.body || {};
    if (typeof username !== 'string' || typeof password !== 'string') {
      res.status(400).json({ error: 'Username and password are required.' });
      return;
    }
    if (!verifyAdminCredentials(username, password)) {
      res.status(401).json({ error: 'Invalid admin username or password.' });
      return;
    }
    const token = signAdminToken(username.trim());
    res.json({ token, username: username.trim() });
  });

  app.get('/api/admin/me', requireAdmin, (req, res) => {
    const username = (req as Request & { adminUser?: string }).adminUser;
    res.json({ username, role: 'admin' });
  });

  app.get('/api/admin/overview', requireAdmin, async (_req, res) => {
    try {
      const overview = await db.getOverview();
      res.json(overview);
    } catch {
      res.status(500).json({ error: 'Failed to load admin overview' });
    }
  });

  app.get('/api/admin/entries', requireAdmin, async (req, res) => {
    try {
      const { type, status, category, q } = req.query;
      const entries = await db.listEntries({
        type: typeof type === 'string' ? type : undefined,
        status: typeof status === 'string' ? status : undefined,
        category: typeof category === 'string' ? category : undefined,
        q: typeof q === 'string' ? q : undefined,
        includeAllStatuses: true,
        sort: 'latest',
      });
      res.json(entries);
    } catch {
      res.status(500).json({ error: 'Failed to load entries' });
    }
  });

  app.post('/api/admin/entries', requireAdmin, async (req, res) => {
    try {
      const {
        type,
        title,
        excerpt,
        content,
        steps,
        codeSnippet,
        snippetLanguage,
        category,
        author,
        readTime,
        difficulty,
        coverImage,
        status,
        featured,
      } = req.body || {};

      if (!title || typeof title !== 'string' || title.trim().length < 3) {
        res.status(400).json({ error: 'Title is required.' });
        return;
      }
      if (!content || typeof content !== 'string' || content.trim().length < 5) {
        res.status(400).json({ error: 'Content is required.' });
        return;
      }

      const entry = await db.createEntry({
        type: type === 'tip' ? 'tip' : 'blog',
        title,
        excerpt: typeof excerpt === 'string' && excerpt.trim() ? excerpt : content.slice(0, 160),
        content,
        steps: Array.isArray(steps) ? steps : undefined,
        codeSnippet: typeof codeSnippet === 'string' ? codeSnippet : undefined,
        snippetLanguage: typeof snippetLanguage === 'string' ? snippetLanguage : undefined,
        category: typeof category === 'string' && category ? category : 'Engineering',
        author: typeof author === 'string' && author.trim() ? author : 'Editorial Team',
        readTime: typeof readTime === 'string' ? readTime : undefined,
        difficulty:
          difficulty === 'Intermediate' || difficulty === 'Advanced' ? difficulty : 'Beginner',
        coverImage: typeof coverImage === 'string' && coverImage.trim() ? coverImage : undefined,
        status: status === 'draft' || status === 'pending' ? status : 'published',
        featured: Boolean(featured),
      });
      res.status(201).json(entry);
    } catch {
      res.status(500).json({ error: 'Failed to create entry' });
    }
  });

  app.patch('/api/admin/entries/:id', requireAdmin, async (req, res) => {
    try {
      const updated = await db.updateEntry(req.params.id, req.body || {});
      if (!updated) {
        res.status(404).json({ error: 'Entry not found' });
        return;
      }
      res.json(updated);
    } catch {
      res.status(500).json({ error: 'Failed to update entry' });
    }
  });

  app.delete('/api/admin/entries/:id', requireAdmin, async (req, res) => {
    try {
      const ok = await db.deleteEntry(req.params.id);
      if (!ok) {
        res.status(404).json({ error: 'Entry not found' });
        return;
      }
      res.json({ deleted: true });
    } catch {
      res.status(500).json({ error: 'Failed to delete entry' });
    }
  });

  app.get('/api/admin/comments', requireAdmin, async (_req, res) => {
    try {
      const comments = await db.listAllComments();
      res.json(comments);
    } catch {
      res.status(500).json({ error: 'Failed to load comments' });
    }
  });

  app.patch('/api/admin/comments/:id', requireAdmin, async (req, res) => {
    try {
      const { approved } = req.body || {};
      const updated = await db.toggleCommentApproval(req.params.id, Boolean(approved));
      if (!updated) {
        res.status(404).json({ error: 'Comment not found' });
        return;
      }
      res.json(updated);
    } catch {
      res.status(500).json({ error: 'Failed to update comment' });
    }
  });

  app.delete('/api/admin/comments/:id', requireAdmin, async (req, res) => {
    try {
      const ok = await db.deleteComment(req.params.id);
      if (!ok) {
        res.status(404).json({ error: 'Comment not found' });
        return;
      }
      res.json({ deleted: true });
    } catch {
      res.status(500).json({ error: 'Failed to delete comment' });
    }
  });

  app.post('/api/admin/categories', requireAdmin, async (req, res) => {
    try {
      const { name, description } = req.body || {};
      if (!name || typeof name !== 'string' || !name.trim()) {
        res.status(400).json({ error: 'Category name is required.' });
        return;
      }
      const created = await db.createCategory(name, typeof description === 'string' ? description : '');
      res.status(201).json(created);
    } catch {
      res.status(500).json({ error: 'Failed to create category' });
    }
  });

  app.delete('/api/admin/categories/:id', requireAdmin, async (req, res) => {
    try {
      const ok = await db.deleteCategory(req.params.id);
      if (!ok) {
        res.status(404).json({ error: 'Category not found' });
        return;
      }
      res.json({ deleted: true });
    } catch {
      res.status(500).json({ error: 'Failed to delete category' });
    }
  });

  app.patch('/api/admin/settings', requireAdmin, async (req, res) => {
    try {
      const updated = await db.updateSettings(req.body || {});
      res.json(updated);
    } catch {
      res.status(500).json({ error: 'Failed to update settings' });
    }
  });

  // Vite dev middleware or production static serving
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Fieldnote server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
