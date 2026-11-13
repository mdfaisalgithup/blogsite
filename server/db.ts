import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { MongoClient, Db, Collection } from 'mongodb';
import type { Entry, CommentItem, CategoryItem, SiteSettings, DashboardOverview } from '../src/types.ts';

interface StoreData {
  entries: Entry[];
  comments: CommentItem[];
  categories: CategoryItem[];
  settings: SiteSettings;
}

const DATA_DIR = path.resolve(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'fieldnote-db.json');

function createInitialData(): StoreData {
  const now = Date.now();
  const daysAgo = (days: number) => new Date(now - days * 86400000).toISOString();

  const categories: CategoryItem[] = [
    {
      id: 'cat-eng',
      name: 'Engineering',
      slug: 'engineering',
      description: 'Architecture notes, backend reliability, and clean code patterns.',
    },
    {
      id: 'cat-design',
      name: 'Design Systems',
      slug: 'design-systems',
      description: 'Typography, spacing discipline, and editorial layout mechanics.',
    },
    {
      id: 'cat-prod',
      name: 'Productivity',
      slug: 'productivity',
      description: 'Deep work rituals, note-taking workflows, and focus habits.',
    },
    {
      id: 'cat-cli',
      name: 'Terminal & CLI',
      slug: 'terminal-cli',
      description: 'Fast shell shortcuts, Git tricks, and repeatable automation snippets.',
    },
    {
      id: 'cat-writing',
      name: 'Writing & Craft',
      slug: 'writing-craft',
      description: 'Structuring technical essays, documentation, and clear prose.',
    },
  ];

  const entries: Entry[] = [
    {
      id: 'entry-1',
      slug: 'designing-calm-software-that-respects-attention',
      type: 'blog',
      title: 'Designing Calm Software That Respects Human Attention',
      excerpt:
        'Why stripping away decorative clutter, notification noise, and visual clutter creates interfaces people actually enjoy returning to every morning.',
      content: `Most modern web tools treat every square inch of the viewport like contested real estate. Badges compete with banners, status indicators blink without urgency, and nested containers create walls of borders that exhaust the eye before a single paragraph is read.

Calm software begins with a deliberate hierarchy of silence. When a surface uses generous paper margins, clear typographic scale, and restrained color contrast, the user immediately understands where to look first and what action matters most.

In our own product reviews, removing secondary chrome from reading views consistently increased completion rates. People read longer essays when the page behaves like a well-typeset book rather than a trading terminal.

Start by auditing every pill badge, icon prefix, and card border on your primary screen. If an element does not help the reader make a decision or navigate faster, let whitespace do the separating instead.`,
      category: 'Design Systems',
      author: 'Nadia Rahman',
      readTime: '6 min read',
      coverImage: '/src/assets/images/hero_editorial_desk_1794545992527.jpg',
      status: 'published',
      featured: true,
      views: 1420,
      upvotes: 118,
      copies: 0,
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
    {
      id: 'entry-2',
      slug: 'mongodb-indexing-habits-for-fast-queries',
      type: 'blog',
      title: 'MongoDB Indexing Habits That Prevent Slow Collection Scans',
      excerpt:
        'A practical field guide to compound indexes, ESR ordering, and lean projections when scaling content-heavy applications.',
      content: `When a blog or knowledge platform starts small, nearly every query feels instantaneous. Once your collections cross a few hundred thousand documents, unindexed sort operations and regex searches quietly become your primary bottleneck.

Follow the Equality, Sort, Range (ESR) rule whenever designing compound indexes. Place exact-match filters such as status or category first, followed by your sort key such as createdAt descending, and leave range predicates for last.

Pair smart indexes with explicit field projections on list endpoints. Feeding full article bodies to a summary feed wastes network bandwidth and memory pressure on both the database server and the client browser.

Finally, inspect explain plans on real production-shaped data before shipping new filter combinations. Five minutes spent validating index coverage saves hours of emergency tuning later.`,
      category: 'Engineering',
      author: 'Tariq Hassan',
      readTime: '5 min read',
      coverImage: '/src/assets/images/article_systems_craft_1794545991735.jpg',
      status: 'published',
      featured: true,
      views: 980,
      upvotes: 87,
      copies: 0,
      createdAt: daysAgo(3),
      updatedAt: daysAgo(3),
    },
    {
      id: 'entry-3',
      slug: 'index-card-method-for-daily-technical-notes',
      type: 'blog',
      title: 'The Index Card Method for Retaining What You Read',
      excerpt:
        'How writing one concise synthesis card per reading session turns passive scrolling into a permanent personal library.',
      content: `Bookmarking fifty articles a week creates an illusion of learning while leaving very little behind in memory. Digital folders grow too tall to browse, and raw highlights lack the context of why an idea mattered when you found it.

Borrowing from physical commonplace notebooks, keep a strict limit: after reading any essay or documentation page, summarize the core mechanism in three plain sentences on a single card.

Write the summary in your own vocabulary without copying the author's phrasing. If you cannot explain the concept cleanly in fifty words, revisit the source section until the gap disappears.

Over a few months, these compact cards form an interconnected reference shelf you can review in ten minutes before starting any new project.`,
      category: 'Productivity',
      author: 'Farhana Karim',
      readTime: '4 min read',
      coverImage: '/src/assets/images/article_focus_ritual_1794545993226.jpg',
      status: 'published',
      featured: false,
      views: 745,
      upvotes: 64,
      copies: 0,
      createdAt: daysAgo(5),
      updatedAt: daysAgo(5),
    },
    {
      id: 'entry-4',
      slug: 'baseline-grids-and-measure-for-readable-essays',
      type: 'blog',
      title: 'Typographic Measure and Rhythm for Long-Form Web Essays',
      excerpt:
        'Choosing comfortable line lengths, vertical rhythm, and subtle caption styling that keep readers engaged past the fold.',
      content: `Line length controls reading fatigue more than font choice alone. Lines stretching past ninety characters force the eye to hunt on every return sweep, while narrow columns under forty characters chop sentences into exhausting staccato bursts.

Target sixty-five to seventy-two characters per line for body prose. Paired with a relaxed line height between 1.65 and 1.75, paragraphs breathe naturally across desktop and tablet screens alike.

Keep supporting metadata—category labels, dates, and reading durations—as quiet unboxed text separated by typographic dots. Reserving borders and fills for interactive buttons ensures readers never confuse static labels with clickable controls.`,
      category: 'Design Systems',
      author: 'Samir Chowdhury',
      readTime: '5 min read',
      coverImage: '/src/assets/images/article_design_grid_1794545993123.jpg',
      status: 'published',
      featured: false,
      views: 612,
      upvotes: 53,
      copies: 0,
      createdAt: daysAgo(7),
      updatedAt: daysAgo(7),
    },
    {
      id: 'tip-1',
      slug: 'git-worktree-switch-branches-without-stashing',
      type: 'tip',
      title: 'Switch Branches Without Stashing Using Git Worktrees',
      excerpt:
        'Check out an urgent hotfix branch in a parallel folder in seconds while keeping your current editor state and dev server untouched.',
      content:
        'Instead of stashing half-finished work and rebuilding dependencies every time an urgent review arrives, mount a second branch into an adjacent directory using git worktree.',
      steps: [
        'Run the worktree add command from your repository root to create a sibling folder for the hotfix branch.',
        'Open the new folder in a second editor window to fix and test independently.',
        'Remove the temporary folder once merged with git worktree remove.',
      ],
      codeSnippet: 'git worktree add ../hotfix-auth -b fix/token-refresh main',
      snippetLanguage: 'bash',
      category: 'Terminal & CLI',
      author: 'Tariq Hassan',
      readTime: '2 min tip',
      difficulty: 'Intermediate',
      status: 'published',
      featured: true,
      views: 890,
      upvotes: 95,
      copies: 142,
      createdAt: daysAgo(2),
      updatedAt: daysAgo(2),
    },
    {
      id: 'tip-2',
      slug: 'css-text-wrap-balance-prevents-orphan-words',
      type: 'tip',
      title: 'Prevent Single-Word Orphan Lines in Headlines With One CSS Rule',
      excerpt:
        'Use native CSS text-wrap: balance on titles and card headings so lines break evenly without manual <br> tags.',
      content:
        'Long editorial titles frequently leave a single lonely word dangling on the final line. Modern browsers support text-wrap: balance natively to distribute words evenly across lines.',
      steps: [
        'Apply text-wrap: balance to h1, h2, and card headline classes (works best on blocks under 6 lines).',
        'Pair with a sensible max-width (e.g., max-w-2xl) so multi-line titles stay cohesive.',
        'Verify at both 1440px desktop and 375px mobile viewports.',
      ],
      codeSnippet: `.editorial-heading {\n  text-wrap: balance;\n  max-width: 24ch;\n}`,
      snippetLanguage: 'css',
      category: 'Design Systems',
      author: 'Nadia Rahman',
      readTime: '1 min tip',
      difficulty: 'Beginner',
      status: 'published',
      featured: true,
      views: 720,
      upvotes: 81,
      copies: 98,
      createdAt: daysAgo(4),
      updatedAt: daysAgo(4),
    },
    {
      id: 'tip-3',
      slug: 'find-and-kill-stuck-port-process-instantly',
      type: 'tip',
      title: 'Inspect and Free a Stuck Local Port in One Command',
      excerpt:
        'Quickly locate whichever background Node or Vite process is holding port 3000 and terminate it cleanly.',
      content:
        'When a dev server exits unexpectedly and leaves port 3000 occupied, use lsof to pinpoint the exact PID before clearing it.',
      steps: [
        'Query which process owns port 3000 using lsof -ti:3000.',
        'Pipe the returned PID to kill -9 only after confirming it belongs to your local dev session.',
      ],
      codeSnippet: 'lsof -ti:3000 | xargs kill -9',
      snippetLanguage: 'bash',
      category: 'Terminal & CLI',
      author: 'Arif Mahmud',
      readTime: '1 min tip',
      difficulty: 'Beginner',
      status: 'published',
      featured: false,
      views: 640,
      upvotes: 73,
      copies: 165,
      createdAt: daysAgo(6),
      updatedAt: daysAgo(6),
    },
    {
      id: 'tip-4',
      slug: 'two-minute-rule-for-pr-descriptions',
      type: 'tip',
      title: 'The Three-Line Template That Cuts Code Review Time in Half',
      excerpt:
        'Replace vague "fixed bug" pull request notes with What Changed, Why It Happened, and How to Verify.',
      content:
        'Reviewers spend most of their time reconstructing intent rather than reading syntax. A structured three-part summary gets accurate approvals faster.',
      steps: [
        'State the observable problem or user goal in one sentence.',
        'Summarize the architectural choice and any trade-offs made.',
        'Include exact verification steps or test commands reviewers can run.',
      ],
      codeSnippet: `## Context\nWhy this change is needed.\n\n## Approach\nKey files touched and trade-offs.\n\n## Verification\nnpm run lint && npm run build`,
      snippetLanguage: 'markdown',
      category: 'Writing & Craft',
      author: 'Farhana Karim',
      readTime: '2 min tip',
      difficulty: 'Beginner',
      status: 'published',
      featured: false,
      views: 510,
      upvotes: 59,
      copies: 76,
      createdAt: daysAgo(8),
      updatedAt: daysAgo(8),
    },
    {
      id: 'tip-5',
      slug: 'use-explain-execution-stats-in-mongodb',
      type: 'tip',
      title: 'Verify MongoDB Query Performance With executionStats',
      excerpt:
        'Check totalDocsExamined vs nReturned right inside mongosh to catch full collection scans early.',
      content:
        'A fast query in staging can still scan every document if the index is missing. Always inspect executionStats to ensure totalDocsExamined stays close to nReturned.',
      steps: [
        'Append .explain("executionStats") to any find() query in mongosh.',
        'Check that winningPlan.stage uses IXSCAN rather than COLLSCAN.',
        'Compare totalDocsExamined against nReturned—an ideal ratio is 1:1.',
      ],
      codeSnippet: `db.entries.find({ status: "published", category: "Engineering" })\n  .sort({ createdAt: -1 })\n  .explain("executionStats")`,
      snippetLanguage: 'javascript',
      category: 'Engineering',
      author: 'Tariq Hassan',
      readTime: '2 min tip',
      difficulty: 'Intermediate',
      status: 'pending',
      featured: false,
      views: 12,
      upvotes: 2,
      copies: 1,
      createdAt: daysAgo(0),
      updatedAt: daysAgo(0),
    },
  ];

  const comments: CommentItem[] = [
    {
      id: 'cmt-1',
      entryId: 'entry-1',
      entryTitle: 'Designing Calm Software That Respects Human Attention',
      author: 'Rashedul Islam',
      body: 'The point about unboxed metadata really clicked for me. Removing pill tags from our dashboard cards made the whole page calmer overnight.',
      approved: true,
      createdAt: daysAgo(1),
    },
    {
      id: 'cmt-2',
      entryId: 'tip-1',
      entryTitle: 'Switch Branches Without Stashing Using Git Worktrees',
      author: 'Mehedi Hasan',
      body: 'Git worktrees completely replaced git stash in my daily workflow. Keeping node_modules intact per folder is huge.',
      approved: true,
      createdAt: daysAgo(1),
    },
    {
      id: 'cmt-3',
      entryId: 'entry-2',
      entryTitle: 'MongoDB Indexing Habits That Prevent Slow Collection Scans',
      author: 'Sadia Afrin',
      body: 'ESR ordering is one of those rules you only learn once you hit a slow sort in production. Clear explanation!',
      approved: true,
      createdAt: daysAgo(2),
    },
  ];

  const settings: SiteSettings = {
    siteTitle: 'Fieldnote',
    siteTagline: 'Thoughtful essays, engineering notes, and practical tricks & tips shared by builders.',
    requireApproval: false,
  };

  return { entries, comments, categories, settings };
}

class DatabaseService {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private useMongo = false;
  private memoryStore: StoreData | null = null;
  private initPromise: Promise<void> | null = null;

  private getMongoUri(): string | null {
    const rawUri =
      process.env.MONGODB_URI || process.env.MONGODB_URL || process.env.MONGO_URI || '';
    let cleanUri = rawUri.trim().replace(/^["']|["']$/g, '');

    if (cleanUri.length > 0) {
      if (
        (cleanUri.includes('<password>') || cleanUri.includes('<db_password>')) &&
        process.env.MONGODB_PASS
      ) {
        cleanUri = cleanUri
          .replace(/<password>/g, encodeURIComponent(process.env.MONGODB_PASS))
          .replace(/<db_password>/g, encodeURIComponent(process.env.MONGODB_PASS));
      }
      return cleanUri;
    }

    if (process.env.MONGODB_HOST && process.env.MONGODB_HOST.trim().length > 0) {
      const user = encodeURIComponent(process.env.MONGODB_USER || 'blogsite');
      const pass = encodeURIComponent(process.env.MONGODB_PASS || '');
      const host = process.env.MONGODB_HOST.trim();
      const dbName = process.env.MONGODB_DB || 'blogsite';
      if (pass) {
        return `mongodb+srv://${user}:${pass}@${host}/${dbName}?retryWrites=true&w=majority&authSource=admin`;
      }
    }
    return null;
  }

  private async tryConnectMongo(uri: string, authSource?: string): Promise<boolean> {
    const options: Record<string, unknown> = { serverSelectionTimeoutMS: 5000 };
    if (authSource) {
      options.authSource = authSource;
    }
    const client = new MongoClient(uri, options);
    try {
      await client.connect();
      const dbName = process.env.MONGODB_DB || 'blogsite';
      const db = client.db(dbName);
      await db.command({ ping: 1 });
      this.client = client;
      this.db = db;
      this.useMongo = true;
      console.log(`[db] Connected to MongoDB (${dbName})`);
      await this.seedMongoIfEmpty();
      return true;
    } catch (err) {
      await client.close().catch(() => undefined);
      throw err;
    }
  }

  async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;
    this.initPromise = this._initInternal();
    return this.initPromise;
  }

  private async _initInternal(): Promise<void> {
    const uri = this.getMongoUri();
    if (uri) {
      try {
        await this.tryConnectMongo(uri);
        return;
      } catch (err) {
        const msg = (err as Error).message || '';
        const hasExplicitAuthSource = /authSource=/i.test(uri);
        if (!hasExplicitAuthSource && /auth/i.test(msg)) {
          try {
            await this.tryConnectMongo(uri, 'admin');
            return;
          } catch (retryErr) {
            console.warn(
              '[db] MongoDB authentication error (check username/password and Atlas Database Access user in Secrets), using disk-backed store:',
              (retryErr as Error).message
            );
          }
        } else {
          console.warn('[db] MongoDB connection fallback to disk-backed store:', msg);
        }
        this.useMongo = false;
      }
    }
    this.loadDiskStore();
  }

  private loadDiskStore(): void {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf8');
        this.memoryStore = JSON.parse(raw) as StoreData;
        return;
      }
    } catch (err) {
      console.warn('[db] Could not read local data file, recreating seed:', (err as Error).message);
    }
    this.memoryStore = createInitialData();
    this.saveDiskStore();
  }

  private saveDiskStore(): void {
    if (!this.memoryStore) return;
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.memoryStore, null, 2), 'utf8');
    } catch (err) {
      console.warn('[db] Failed to persist disk store:', (err as Error).message);
    }
  }

  private async seedMongoIfEmpty(): Promise<void> {
    if (!this.db) return;
    const entriesCol = this.db.collection<Entry>('entries');
    const count = await entriesCol.countDocuments();
    if (count === 0) {
      const seed = createInitialData();
      await entriesCol.insertMany(seed.entries);
      await this.db.collection<CategoryItem>('categories').insertMany(seed.categories);
      await this.db.collection<CommentItem>('comments').insertMany(seed.comments);
      await this.db.collection<SiteSettings & { _id?: string }>('settings').insertOne({
        _id: 'site',
        ...seed.settings,
      });
    }
    await entriesCol.createIndex({ slug: 1 }, { unique: true }).catch(() => undefined);
    await entriesCol.createIndex({ status: 1, type: 1, createdAt: -1 }).catch(() => undefined);
  }

  private col<T extends object>(name: string): Collection<T> {
    if (!this.db) throw new Error('MongoDB not initialized');
    return this.db.collection<T>(name);
  }

  private slugify(text: string): string {
    const base = text
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .slice(0, 64);
    const suffix = crypto.randomBytes(2).toString('hex');
    return `${base || 'entry'}-${suffix}`;
  }

  async getPublicSettings(): Promise<SiteSettings> {
    await this.init();
    if (this.useMongo) {
      const doc = await this.col<SiteSettings & { _id?: string }>('settings').findOne({ _id: 'site' });
      if (doc) {
        return {
          siteTitle: doc.siteTitle,
          siteTagline: doc.siteTagline,
          requireApproval: doc.requireApproval,
        };
      }
    }
    return this.memoryStore!.settings;
  }

  async updateSettings(patch: Partial<SiteSettings>): Promise<SiteSettings> {
    await this.init();
    const current = await this.getPublicSettings();
    const updated: SiteSettings = {
      siteTitle: typeof patch.siteTitle === 'string' && patch.siteTitle.trim() ? patch.siteTitle.trim() : current.siteTitle,
      siteTagline:
        typeof patch.siteTagline === 'string' && patch.siteTagline.trim()
          ? patch.siteTagline.trim()
          : current.siteTagline,
      requireApproval: typeof patch.requireApproval === 'boolean' ? patch.requireApproval : current.requireApproval,
    };
    if (this.useMongo) {
      await this.col<SiteSettings & { _id?: string }>('settings').updateOne(
        { _id: 'site' },
        { $set: updated },
        { upsert: true }
      );
      return updated;
    }
    this.memoryStore!.settings = updated;
    this.saveDiskStore();
    return updated;
  }

  async listCategories(includeCounts = true): Promise<CategoryItem[]> {
    await this.init();
    let categories: CategoryItem[];
    let publishedEntries: Entry[];

    if (this.useMongo) {
      categories = await this.col<CategoryItem>('categories').find({}, { projection: { _id: 0 } }).toArray();
      publishedEntries = includeCounts
        ? await this.col<Entry>('entries').find({ status: 'published' }, { projection: { _id: 0, category: 1 } }).toArray()
        : [];
    } else {
      categories = [...this.memoryStore!.categories];
      publishedEntries = this.memoryStore!.entries.filter((e) => e.status === 'published');
    }

    if (!includeCounts) return categories;
    return categories.map((cat) => ({
      ...cat,
      count: publishedEntries.filter((e) => e.category.toLowerCase() === cat.name.toLowerCase()).length,
    }));
  }

  async createCategory(name: string, description: string): Promise<CategoryItem> {
    await this.init();
    const cleanName = name.trim();
    const slug = cleanName
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-');
    const item: CategoryItem = {
      id: `cat-${crypto.randomBytes(4).toString('hex')}`,
      name: cleanName,
      slug: slug || `cat-${Date.now()}`,
      description: description.trim() || `Articles and tips about ${cleanName}.`,
    };

    if (this.useMongo) {
      await this.col<CategoryItem>('categories').insertOne(item);
      return item;
    }
    this.memoryStore!.categories.push(item);
    this.saveDiskStore();
    return item;
  }

  async deleteCategory(id: string): Promise<boolean> {
    await this.init();
    if (this.useMongo) {
      const res = await this.col<CategoryItem>('categories').deleteOne({ id });
      return res.deletedCount > 0;
    }
    const before = this.memoryStore!.categories.length;
    this.memoryStore!.categories = this.memoryStore!.categories.filter((c) => c.id !== id);
    this.saveDiskStore();
    return this.memoryStore!.categories.length < before;
  }

  async listEntries(filters: {
    type?: string;
    category?: string;
    status?: string;
    q?: string;
    sort?: string;
    featured?: boolean;
    includeAllStatuses?: boolean;
  }): Promise<Entry[]> {
    await this.init();
    let entries: Entry[];

    if (this.useMongo) {
      const query: Record<string, unknown> = {};
      if (!filters.includeAllStatuses) {
        query.status = 'published';
      } else if (filters.status && filters.status !== 'all') {
        query.status = filters.status;
      }
      if (filters.type && filters.type !== 'all') {
        query.type = filters.type;
      }
      if (filters.category && filters.category !== 'all') {
        query.category = filters.category;
      }
      if (filters.featured) {
        query.featured = true;
      }
      entries = await this.col<Entry>('entries').find(query, { projection: { _id: 0 } }).toArray();
    } else {
      entries = this.memoryStore!.entries.filter((e) => {
        if (!filters.includeAllStatuses && e.status !== 'published') return false;
        if (filters.includeAllStatuses && filters.status && filters.status !== 'all' && e.status !== filters.status) {
          return false;
        }
        if (filters.type && filters.type !== 'all' && e.type !== filters.type) return false;
        if (filters.category && filters.category !== 'all' && e.category !== filters.category) return false;
        if (filters.featured && !e.featured) return false;
        return true;
      });
    }

    if (filters.q && filters.q.trim()) {
      const term = filters.q.trim().toLowerCase();
      entries = entries.filter(
        (e) =>
          e.title.toLowerCase().includes(term) ||
          e.excerpt.toLowerCase().includes(term) ||
          e.content.toLowerCase().includes(term) ||
          e.author.toLowerCase().includes(term) ||
          e.category.toLowerCase().includes(term) ||
          (e.codeSnippet && e.codeSnippet.toLowerCase().includes(term))
      );
    }

    if (filters.sort === 'popular') {
      entries.sort((a, b) => b.upvotes * 3 + b.views - (a.upvotes * 3 + a.views));
    } else {
      entries.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return entries;
  }

  async getEntryBySlugOrId(slugOrId: string, incrementViews = false): Promise<Entry | null> {
    await this.init();
    if (this.useMongo) {
      const entry = await this.col<Entry>('entries').findOne(
        { $or: [{ slug: slugOrId }, { id: slugOrId }] },
        { projection: { _id: 0 } }
      );
      if (!entry) return null;
      if (incrementViews) {
        await this.col<Entry>('entries').updateOne({ id: entry.id }, { $inc: { views: 1 } });
        entry.views += 1;
      }
      return entry;
    }

    const entry = this.memoryStore!.entries.find((e) => e.slug === slugOrId || e.id === slugOrId) || null;
    if (!entry) return null;
    if (incrementViews) {
      entry.views += 1;
      this.saveDiskStore();
    }
    return { ...entry };
  }

  async createEntry(input: {
    type: 'blog' | 'tip';
    title: string;
    excerpt: string;
    content: string;
    steps?: string[];
    codeSnippet?: string;
    snippetLanguage?: string;
    category: string;
    author: string;
    readTime?: string;
    difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
    coverImage?: string;
    status: 'published' | 'pending' | 'draft';
    featured?: boolean;
  }): Promise<Entry> {
    await this.init();
    const now = new Date().toISOString();
    const wordCount = input.content.trim().split(/\s+/).filter(Boolean).length;
    const computedReadTime =
      input.readTime?.trim() ||
      (input.type === 'tip' ? '2 min tip' : `${Math.max(2, Math.ceil(wordCount / 180))} min read`);

    const entry: Entry = {
      id: `${input.type}-${crypto.randomBytes(4).toString('hex')}`,
      slug: this.slugify(input.title),
      type: input.type,
      title: input.title.trim(),
      excerpt: input.excerpt.trim(),
      content: input.content.trim(),
      steps: input.steps?.map((s) => s.trim()).filter(Boolean),
      codeSnippet: input.codeSnippet?.trim() || undefined,
      snippetLanguage: input.snippetLanguage?.trim() || undefined,
      category: input.category.trim(),
      author: input.author.trim() || 'Community Writer',
      readTime: computedReadTime,
      difficulty: input.type === 'tip' ? input.difficulty || 'Beginner' : undefined,
      coverImage: input.coverImage?.trim() || undefined,
      status: input.status,
      featured: Boolean(input.featured),
      views: 0,
      upvotes: 0,
      copies: 0,
      createdAt: now,
      updatedAt: now,
    };

    if (this.useMongo) {
      await this.col<Entry>('entries').insertOne(entry);
      return entry;
    }
    this.memoryStore!.entries.unshift(entry);
    this.saveDiskStore();
    return entry;
  }

  async updateEntry(id: string, patch: Partial<Entry>): Promise<Entry | null> {
    await this.init();
    const cleanPatch: Partial<Entry> = { ...patch, updatedAt: new Date().toISOString() };
    delete cleanPatch.id;
    delete cleanPatch.slug;

    if (this.useMongo) {
      const result = await this.col<Entry>('entries').findOneAndUpdate(
        { id },
        { $set: cleanPatch },
        { returnDocument: 'after', projection: { _id: 0 } }
      );
      return result || null;
    }

    const idx = this.memoryStore!.entries.findIndex((e) => e.id === id);
    if (idx === -1) return null;
    this.memoryStore!.entries[idx] = { ...this.memoryStore!.entries[idx], ...cleanPatch };
    this.saveDiskStore();
    return { ...this.memoryStore!.entries[idx] };
  }

  async deleteEntry(id: string): Promise<boolean> {
    await this.init();
    if (this.useMongo) {
      const res = await this.col<Entry>('entries').deleteOne({ id });
      await this.col<CommentItem>('comments').deleteMany({ entryId: id });
      return res.deletedCount > 0;
    }
    const before = this.memoryStore!.entries.length;
    this.memoryStore!.entries = this.memoryStore!.entries.filter((e) => e.id !== id);
    this.memoryStore!.comments = this.memoryStore!.comments.filter((c) => c.entryId !== id);
    this.saveDiskStore();
    return this.memoryStore!.entries.length < before;
  }

  async incrementEntryCounter(id: string, field: 'upvotes' | 'copies'): Promise<Entry | null> {
    await this.init();
    if (this.useMongo) {
      const res = await this.col<Entry>('entries').findOneAndUpdate(
        { id },
        { $inc: { [field]: 1 } },
        { returnDocument: 'after', projection: { _id: 0 } }
      );
      return res || null;
    }
    const entry = this.memoryStore!.entries.find((e) => e.id === id);
    if (!entry) return null;
    entry[field] += 1;
    this.saveDiskStore();
    return { ...entry };
  }

  async listCommentsForEntry(entryId: string, onlyApproved = true): Promise<CommentItem[]> {
    await this.init();
    if (this.useMongo) {
      const query: Record<string, unknown> = { entryId };
      if (onlyApproved) query.approved = true;
      return this.col<CommentItem>('comments')
        .find(query, { projection: { _id: 0 } })
        .sort({ createdAt: -1 })
        .toArray();
    }
    return this.memoryStore!.comments
      .filter((c) => c.entryId === entryId && (!onlyApproved || c.approved))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async listAllComments(): Promise<CommentItem[]> {
    await this.init();
    let comments: CommentItem[];
    let entries: Entry[];
    if (this.useMongo) {
      comments = await this.col<CommentItem>('comments')
        .find({}, { projection: { _id: 0 } })
        .sort({ createdAt: -1 })
        .toArray();
      entries = await this.col<Entry>('entries').find({}, { projection: { _id: 0, id: 1, title: 1 } }).toArray();
    } else {
      comments = [...this.memoryStore!.comments].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      entries = this.memoryStore!.entries;
    }
    const titleMap = new Map(entries.map((e) => [e.id, e.title]));
    return comments.map((c) => ({ ...c, entryTitle: titleMap.get(c.entryId) || c.entryTitle || 'Deleted Entry' }));
  }

  async addComment(entryId: string, author: string, body: string): Promise<CommentItem | null> {
    await this.init();
    const entry = await this.getEntryBySlugOrId(entryId, false);
    if (!entry) return null;

    const comment: CommentItem = {
      id: `cmt-${crypto.randomBytes(4).toString('hex')}`,
      entryId: entry.id,
      entryTitle: entry.title,
      author: author.trim() || 'Reader',
      body: body.trim(),
      approved: true,
      createdAt: new Date().toISOString(),
    };

    if (this.useMongo) {
      await this.col<CommentItem>('comments').insertOne(comment);
      return comment;
    }
    this.memoryStore!.comments.unshift(comment);
    this.saveDiskStore();
    return comment;
  }

  async toggleCommentApproval(id: string, approved: boolean): Promise<CommentItem | null> {
    await this.init();
    if (this.useMongo) {
      const res = await this.col<CommentItem>('comments').findOneAndUpdate(
        { id },
        { $set: { approved } },
        { returnDocument: 'after', projection: { _id: 0 } }
      );
      return res || null;
    }
    const cmt = this.memoryStore!.comments.find((c) => c.id === id);
    if (!cmt) return null;
    cmt.approved = approved;
    this.saveDiskStore();
    return { ...cmt };
  }

  async deleteComment(id: string): Promise<boolean> {
    await this.init();
    if (this.useMongo) {
      const res = await this.col<CommentItem>('comments').deleteOne({ id });
      return res.deletedCount > 0;
    }
    const before = this.memoryStore!.comments.length;
    this.memoryStore!.comments = this.memoryStore!.comments.filter((c) => c.id !== id);
    this.saveDiskStore();
    return this.memoryStore!.comments.length < before;
  }

  async getOverview(): Promise<DashboardOverview> {
    await this.init();
    const entries = await this.listEntries({ includeAllStatuses: true, sort: 'latest' });
    const comments = await this.listAllComments();

    const totalPosts = entries.filter((e) => e.type === 'blog').length;
    const totalTips = entries.filter((e) => e.type === 'tip').length;
    const pendingCount = entries.filter((e) => e.status === 'pending').length;
    const draftCount = entries.filter((e) => e.status === 'draft').length;
    const totalViews = entries.reduce((acc, e) => acc + e.views, 0);
    const totalUpvotes = entries.reduce((acc, e) => acc + e.upvotes, 0);

    const catMap = new Map<string, { count: number; views: number }>();
    for (const e of entries) {
      const cur = catMap.get(e.category) || { count: 0, views: 0 };
      cur.count += 1;
      cur.views += e.views;
      catMap.set(e.category, cur);
    }

    const categoryBreakdown = Array.from(catMap.entries())
      .map(([category, stats]) => ({ category, ...stats }))
      .sort((a, b) => b.count - a.count);

    return {
      totalPosts,
      totalTips,
      pendingCount,
      draftCount,
      totalViews,
      totalUpvotes,
      totalComments: comments.length,
      categoryBreakdown,
      recentEntries: entries.slice(0, 8),
    };
  }
}

export const db = new DatabaseService();
