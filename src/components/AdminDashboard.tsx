import { useEffect, useMemo, useState, FormEvent } from 'react';
import {
  Check,
  Edit3,
  ExternalLink,
  FileText,
  FolderOpen,
  Inbox,
  LayoutDashboard,
  Lightbulb,
  LogOut,
  Menu,
  MessageSquare,
  Plus,
  Search,
  Settings,
  Star,
  Trash2,
  X,
} from 'lucide-react';
import type { CategoryItem, CommentItem, DashboardOverview, Entry, EntryStatus, SiteSettings } from '../types.ts';

interface AdminDashboardProps {
  onExitToPublic: () => void;
}

type AdminTab = 'overview' | 'blogs' | 'tips' | 'pending' | 'comments' | 'settings';

const ADMIN_TOKEN_KEY = 'fieldnote_admin_token_v1';

const COVER_OPTIONS = [
  { label: 'No Cover Image', value: '' },
  { label: 'Sunlit Writing Desk', value: '/src/assets/images/hero_editorial_desk_1794545992527.jpg' },
  { label: 'Modern Studio Desk', value: '/src/assets/images/article_systems_craft_1794545991735.jpg' },
  { label: 'Quiet Study & Index Cards', value: '/src/assets/images/article_focus_ritual_1794545993226.jpg' },
  { label: 'Drafting Grid & Ruler', value: '/src/assets/images/article_design_grid_1794545993123.jpg' },
];

export function AdminDashboard({ onExitToPublic }: AdminDashboardProps) {
  const [token, setToken] = useState<string>(() => localStorage.getItem(ADMIN_TOKEN_KEY) || '');
  const [adminUser, setAdminUser] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({
    siteTitle: 'Fieldnote',
    siteTagline: 'Thoughtful essays, engineering notes, and practical tricks & tips shared by builders.',
    requireApproval: false,
  });
  const [loadingData, setLoadingData] = useState(false);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | EntryStatus>('all');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Admin Entry Editor state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [formType, setFormType] = useState<'blog' | 'tip'>('blog');
  const [formTitle, setFormTitle] = useState('');
  const [formAuthor, setFormAuthor] = useState('');
  const [formCategory, setFormCategory] = useState('Engineering');
  const [formStatus, setFormStatus] = useState<EntryStatus>('published');
  const [formFeatured, setFormFeatured] = useState(false);
  const [formExcerpt, setFormExcerpt] = useState('');
  const [formContent, setFormContent] = useState('');
  const [formStepsText, setFormStepsText] = useState('');
  const [formSnippet, setFormSnippet] = useState('');
  const [formSnippetLang, setFormSnippetLang] = useState('bash');
  const [formDifficulty, setFormDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const [formCover, setFormCover] = useState('');
  const [savingEntry, setSavingEntry] = useState(false);
  const [editorError, setEditorError] = useState('');

  // Category & Settings form state
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSavedNote, setSettingsSavedNote] = useState('');

  const authHeaders = (t = token) => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${t}`,
  });

  useEffect(() => {
    if (!token) {
      setCheckingAuth(false);
      setAdminUser(null);
      return;
    }
    fetch('/api/admin/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (!res.ok) throw new Error('Expired');
        return res.json();
      })
      .then((data) => {
        setAdminUser(data.username);
      })
      .catch(() => {
        localStorage.removeItem(ADMIN_TOKEN_KEY);
        setToken('');
        setAdminUser(null);
      })
      .finally(() => setCheckingAuth(false));
  }, [token]);

  const loadAdminWorkspace = async (activeToken = token) => {
    if (!activeToken) return;
    setLoadingData(true);
    try {
      const headers = { Authorization: `Bearer ${activeToken}` };
      const [ovRes, entRes, cmtRes, catRes, setRes] = await Promise.all([
        fetch('/api/admin/overview', { headers }),
        fetch('/api/admin/entries', { headers }),
        fetch('/api/admin/comments', { headers }),
        fetch('/api/categories'),
        fetch('/api/settings/public'),
      ]);

      if (ovRes.status === 401) {
        handleLogout();
        return;
      }

      const [ov, ent, cmt, cat, set] = await Promise.all([
        ovRes.json(),
        entRes.json(),
        cmtRes.json(),
        catRes.json(),
        setRes.json(),
      ]);

      setOverview(ov);
      setEntries(Array.isArray(ent) ? ent : []);
      setComments(Array.isArray(cmt) ? cmt : []);
      setCategories(Array.isArray(cat) ? cat : []);
      if (set?.siteTitle) setSettings(set);
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (adminUser && token) {
      loadAdminWorkspace(token);
    }
  }, [adminUser, token]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLoginError(data.error || 'Authentication failed.');
        return;
      }
      localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
      setToken(data.token);
      setAdminUser(data.username);
    } catch {
      setLoginError('Network error during sign in.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setToken('');
    setAdminUser(null);
  };

  const openNewEditor = (defaultType: 'blog' | 'tip' = 'blog') => {
    setEditingEntry(null);
    setFormType(defaultType);
    setFormTitle('');
    setFormAuthor('Editorial Team');
    setFormCategory(categories[0]?.name || 'Engineering');
    setFormStatus('published');
    setFormFeatured(false);
    setFormExcerpt('');
    setFormContent('');
    setFormStepsText('');
    setFormSnippet('');
    setFormSnippetLang('bash');
    setFormDifficulty('Beginner');
    setFormCover('');
    setEditorError('');
    setEditorOpen(true);
  };

  const openEditEditor = (entry: Entry) => {
    setEditingEntry(entry);
    setFormType(entry.type);
    setFormTitle(entry.title);
    setFormAuthor(entry.author);
    setFormCategory(entry.category);
    setFormStatus(entry.status);
    setFormFeatured(entry.featured);
    setFormExcerpt(entry.excerpt);
    setFormContent(entry.content);
    setFormStepsText((entry.steps || []).join('\n'));
    setFormSnippet(entry.codeSnippet || '');
    setFormSnippetLang(entry.snippetLanguage || 'bash');
    setFormDifficulty(entry.difficulty || 'Beginner');
    setFormCover(entry.coverImage || '');
    setEditorError('');
    setEditorOpen(true);
  };

  const handleSaveEntry = async (e: FormEvent) => {
    e.preventDefault();
    setEditorError('');
    setSavingEntry(true);
    try {
      const payload = {
        type: formType,
        title: formTitle,
        author: formAuthor,
        category: formCategory,
        status: formStatus,
        featured: formFeatured,
        excerpt: formExcerpt,
        content: formContent,
        steps:
          formType === 'tip'
            ? formStepsText
                .split('\n')
                .map((s) => s.trim())
                .filter(Boolean)
            : [],
        codeSnippet: formType === 'tip' ? formSnippet : '',
        snippetLanguage: formType === 'tip' ? formSnippetLang : '',
        difficulty: formType === 'tip' ? formDifficulty : undefined,
        coverImage: formCover || '',
      };

      const url = editingEntry ? `/api/admin/entries/${editingEntry.id}` : '/api/admin/entries';
      const method = editingEntry ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: authHeaders(),
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditorError(data.error || 'Could not save entry.');
        return;
      }
      setEditorOpen(false);
      await loadAdminWorkspace();
    } catch {
      setEditorError('Network error while saving entry.');
    } finally {
      setSavingEntry(false);
    }
  };

  const handleQuickPatchEntry = async (id: string, patch: Partial<Entry>) => {
    const res = await fetch(`/api/admin/entries/${id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      await loadAdminWorkspace();
    }
  };

  const handleDeleteEntry = async (id: string) => {
    const res = await fetch(`/api/admin/entries/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (res.ok) {
      setConfirmDeleteId(null);
      await loadAdminWorkspace();
    }
  };

  const handleToggleComment = async (cmt: CommentItem) => {
    const res = await fetch(`/api/admin/comments/${cmt.id}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ approved: !cmt.approved }),
    });
    if (res.ok) await loadAdminWorkspace();
  };

  const handleDeleteComment = async (id: string) => {
    const res = await fetch(`/api/admin/comments/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (res.ok) await loadAdminWorkspace();
  };

  const handleAddCategory = async (e: FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const res = await fetch('/api/admin/categories', {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ name: newCatName, description: newCatDesc }),
    });
    if (res.ok) {
      setNewCatName('');
      setNewCatDesc('');
      await loadAdminWorkspace();
    }
  };

  const handleDeleteCategory = async (id: string) => {
    const res = await fetch(`/api/admin/categories/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    });
    if (res.ok) await loadAdminWorkspace();
  };

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    setSettingsSavedNote('');
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify(settings),
      });
      if (res.ok) {
        setSettingsSavedNote('Settings saved.');
        setTimeout(() => setSettingsSavedNote(''), 2500);
      }
    } finally {
      setSavingSettings(false);
    }
  };

  const filteredEntries = useMemo(() => {
    return entries.filter((entry) => {
      if (activeTab === 'blogs' && entry.type !== 'blog') return false;
      if (activeTab === 'tips' && entry.type !== 'tip') return false;
      if (activeTab === 'pending' && entry.status !== 'pending') return false;
      if ((activeTab === 'blogs' || activeTab === 'tips') && statusFilter !== 'all' && entry.status !== statusFilter) {
        return false;
      }
      if (searchTerm.trim()) {
        const q = searchTerm.trim().toLowerCase();
        return (
          entry.title.toLowerCase().includes(q) ||
          entry.author.toLowerCase().includes(q) ||
          entry.category.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [entries, activeTab, statusFilter, searchTerm]);

  const pendingEntries = useMemo(() => entries.filter((e) => e.status === 'pending'), [entries]);

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const renderStatusText = (status: EntryStatus) => {
    if (status === 'published') {
      return <span className="text-xs font-medium text-emerald-700">Published</span>;
    }
    if (status === 'pending') {
      return <span className="text-xs font-medium text-amber-700">Pending Review</span>;
    }
    return <span className="text-xs font-medium text-slate-500">Draft</span>;
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-sm text-slate-500">Verifying admin session...</p>
      </div>
    );
  }

  // Separate Admin Login Gate
  if (!adminUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-12">
        <div className="w-full max-w-md bg-white border border-slate-200 rounded-xl p-8 space-y-6">
          <div className="space-y-1.5">
            <p className="text-xs font-medium text-slate-500">Separate Admin Console</p>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
              {settings.siteTitle} Admin
            </h1>
            <p className="text-sm text-slate-600">
              Sign in to manage blog posts, tricks & tips, moderation queue, and site settings.
            </p>
          </div>

          {loginError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="admin-user" className="block text-xs font-medium text-slate-700 mb-1.5">
                Admin Username
              </label>
              <input
                id="admin-user"
                type="text"
                required
                value={loginUsername}
                onChange={(e) => setLoginUsername(e.target.value)}
                placeholder="admin"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <div>
              <label htmlFor="admin-pass" className="block text-xs font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <input
                id="admin-pass"
                type="password"
                required
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>

            <button
              type="submit"
              disabled={loggingIn}
              className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
            >
              {loggingIn ? 'Signing In...' : 'Sign In to Dashboard'}
            </button>
          </form>

          <div className="pt-4 border-t border-slate-200 flex items-center justify-between gap-3 text-xs">
            <button
              type="button"
              onClick={() => {
                setLoginUsername('admin');
                setLoginPassword('blogsite2026');
              }}
              className="text-slate-600 hover:text-slate-900 underline cursor-pointer"
            >
              Fill Default Admin Credentials
            </button>
            <button
              type="button"
              onClick={onExitToPublic}
              className="text-slate-600 hover:text-slate-900 font-medium cursor-pointer"
            >
              Back to Website
            </button>
          </div>
        </div>
      </div>
    );
  }

  const navItems: Array<{ id: AdminTab; label: string; icon: typeof LayoutDashboard; count?: number }> = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'blogs', label: 'Blog Posts', icon: FileText, count: entries.filter((e) => e.type === 'blog').length },
    { id: 'tips', label: 'Tricks & Tips', icon: Lightbulb, count: entries.filter((e) => e.type === 'tip').length },
    { id: 'pending', label: 'Review Queue', icon: Inbox, count: pendingEntries.length },
    { id: 'comments', label: 'Comments', icon: MessageSquare, count: comments.length },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const tabTitles: Record<AdminTab, string> = {
    overview: 'Overview',
    blogs: 'Blog Posts',
    tips: 'Tricks & Tips',
    pending: 'Review Queue',
    comments: 'Comments',
    settings: 'Categories & Settings',
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-slate-200 shrink-0">
        <div className="h-16 px-6 flex items-center border-b border-slate-200">
          <span className="text-base font-semibold tracking-tight text-slate-900">
            {settings.siteTitle} Admin
          </span>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setSearchTerm('');
                  setStatusFilter('all');
                }}
                className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg transition-colors cursor-pointer ${
                  active
                    ? 'bg-slate-900 text-white font-medium'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <span className="flex items-center gap-2.5 whitespace-nowrap">
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </span>
                {typeof item.count === 'number' && (
                  <span
                    className={`text-xs tabular-nums ${
                      active ? 'text-slate-300' : item.id === 'pending' && item.count > 0 ? 'text-amber-700 font-semibold' : 'text-slate-400'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-200 space-y-2">
          <button
            type="button"
            onClick={onExitToPublic}
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            <span>View Public Site</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-slate-600 hover:text-red-700 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out ({adminUser})</span>
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileNavOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="fixed inset-0 bg-slate-950/40" onClick={() => setMobileNavOpen(false)} />
          <div className="relative w-64 bg-white border-r border-slate-200 flex flex-col z-10">
            <div className="h-16 px-5 flex items-center justify-between border-b border-slate-200">
              <span className="font-semibold text-slate-900">{settings.siteTitle} Admin</span>
              <button
                type="button"
                onClick={() => setMobileNavOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <nav className="flex-1 p-4 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileNavOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 text-sm rounded-lg cursor-pointer ${
                      activeTab === item.id
                        ? 'bg-slate-900 text-white font-medium'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </span>
                    {typeof item.count === 'number' && <span className="text-xs tabular-nums">{item.count}</span>}
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-slate-200 space-y-2">
              <button
                type="button"
                onClick={onExitToPublic}
                className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-slate-700 border border-slate-200 rounded-lg cursor-pointer"
              >
                <span>View Public Site</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-600 hover:text-red-700 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar Contract: Breadcrumb left, 1 primary CTA right */}
        <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-8 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileNavOpen(true)}
              aria-label="Open admin menu"
              className="lg:hidden p-2 text-slate-600 hover:text-slate-900 rounded-lg border border-slate-200 cursor-pointer"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2 text-sm truncate">
              <span className="text-slate-400">Admin</span>
              <span className="text-slate-300">/</span>
              <span className="font-semibold text-slate-900 truncate">{tabTitles[activeTab]}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => openNewEditor(activeTab === 'tips' ? 'tip' : 'blog')}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{activeTab === 'tips' ? 'New Trick & Tip' : 'New Post / Tip'}</span>
          </button>
        </header>

        <main className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto space-y-8">
          {loadingData && !overview ? (
            <div className="space-y-4">
              <div className="h-24 bg-slate-200/70 rounded-lg animate-pulse" />
              <div className="h-64 bg-slate-200/70 rounded-lg animate-pulse" />
            </div>
          ) : (
            <>
              {/* OVERVIEW TAB */}
              {activeTab === 'overview' && overview && (
                <div className="space-y-8">
                  <div className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-slate-200 rounded-lg divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
                    <div className="p-5">
                      <p className="text-xs font-medium text-slate-500">Blog Posts</p>
                      <p className="text-2xl font-semibold text-slate-900 mt-1 tabular-nums">
                        {overview.totalPosts}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 tabular-nums">
                        {overview.draftCount} drafts
                      </p>
                    </div>
                    <div className="p-5">
                      <p className="text-xs font-medium text-slate-500">Tricks & Tips</p>
                      <p className="text-2xl font-semibold text-slate-900 mt-1 tabular-nums">
                        {overview.totalTips}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 tabular-nums">
                        {overview.totalComments} reader notes
                      </p>
                    </div>
                    <div className="p-5">
                      <p className="text-xs font-medium text-slate-500">Pending Review</p>
                      <p
                        className={`text-2xl font-semibold mt-1 tabular-nums ${
                          overview.pendingCount > 0 ? 'text-amber-700' : 'text-slate-900'
                        }`}
                      >
                        {overview.pendingCount}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {overview.pendingCount > 0 ? 'Awaiting approval' : 'All caught up'}
                      </p>
                    </div>
                    <div className="p-5">
                      <p className="text-xs font-medium text-slate-500">Total Engagement</p>
                      <p className="text-2xl font-semibold text-slate-900 mt-1 tabular-nums">
                        {overview.totalViews.toLocaleString()}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 tabular-nums">
                        {overview.totalUpvotes.toLocaleString()} helpful upvotes
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Recent Entries Table */}
                    <div className="lg:col-span-2 bg-white border border-slate-200 rounded-lg overflow-hidden">
                      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                        <h2 className="text-sm font-semibold text-slate-900">Recent Entries</h2>
                        <button
                          type="button"
                          onClick={() => setActiveTab('blogs')}
                          className="text-xs font-medium text-slate-600 hover:text-slate-900 cursor-pointer"
                        >
                          Manage all
                        </button>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 text-[11px] font-medium text-slate-500">
                              <th className="py-2.5 px-5">Title</th>
                              <th className="py-2.5 px-3">Format</th>
                              <th className="py-2.5 px-3">Status</th>
                              <th className="py-2.5 px-5 text-right">Views</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-sm">
                            {overview.recentEntries.map((entry) => (
                              <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                                <td className="py-2.5 px-5 font-medium text-slate-900 max-w-xs truncate">
                                  <button
                                    type="button"
                                    onClick={() => openEditEditor(entry)}
                                    className="hover:underline text-left truncate block w-full cursor-pointer"
                                  >
                                    {entry.title}
                                  </button>
                                </td>
                                <td className="py-2.5 px-3 text-xs text-slate-600 whitespace-nowrap">
                                  {entry.type === 'tip' ? 'Trick & Tip' : 'Blog Post'}
                                </td>
                                <td className="py-2.5 px-3 whitespace-nowrap">{renderStatusText(entry.status)}</td>
                                <td className="py-2.5 px-5 text-right font-mono text-xs text-slate-600 tabular-nums">
                                  {entry.views.toLocaleString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Topic Breakdown */}
                    <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                      <h2 className="text-sm font-semibold text-slate-900">Topic Distribution</h2>
                      <div className="space-y-3.5">
                        {overview.categoryBreakdown.map((item) => {
                          const maxCount = Math.max(...overview.categoryBreakdown.map((c) => c.count), 1);
                          const pct = Math.round((item.count / maxCount) * 100);
                          return (
                            <div key={item.category} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-medium text-slate-700">{item.category}</span>
                                <span className="font-mono text-slate-500 tabular-nums">
                                  {item.count} · {item.views} views
                                </span>
                              </div>
                              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-slate-900 rounded-full"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* BLOG POSTS / TRICKS & TIPS / PENDING QUEUE TABLE */}
              {(activeTab === 'blogs' || activeTab === 'tips' || activeTab === 'pending') && (
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="relative flex-1 max-w-sm">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="search"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Filter by title, author, or category..."
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>

                    {activeTab !== 'pending' && (
                      <div className="inline-flex p-1 bg-slate-200/70 rounded-lg self-start">
                        {(['all', 'published', 'pending', 'draft'] as const).map((st) => (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setStatusFilter(st)}
                            className={`px-3 py-1 text-xs font-medium rounded-md capitalize cursor-pointer whitespace-nowrap ${
                              statusFilter === st ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
                            }`}
                          >
                            {st}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                    {filteredEntries.length === 0 ? (
                      <div className="p-12 text-center space-y-3">
                        <FolderOpen className="w-8 h-8 text-slate-300 mx-auto" />
                        <p className="text-sm font-medium text-slate-900">
                          {activeTab === 'pending'
                            ? 'No pending community submissions'
                            : 'No entries match your filter'}
                        </p>
                        <p className="text-xs text-slate-500">
                          {activeTab === 'pending'
                            ? 'Submitted posts awaiting moderation will appear here.'
                            : 'Create a new entry or clear your search filter.'}
                        </p>
                        {activeTab !== 'pending' && (
                          <button
                            type="button"
                            onClick={() => openNewEditor(activeTab === 'tips' ? 'tip' : 'blog')}
                            className="px-4 py-2 text-xs font-medium text-white bg-slate-900 rounded-lg cursor-pointer"
                          >
                            Create First Entry
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-slate-200 text-[11px] font-medium text-slate-500 bg-slate-50/70">
                              <th className="py-3 px-4">Title</th>
                              <th className="py-3 px-3">Category</th>
                              <th className="py-3 px-3">Author</th>
                              <th className="py-3 px-3">Status</th>
                              <th className="py-3 px-3 text-right">Views</th>
                              <th className="py-3 px-3 text-right">
                                {activeTab === 'tips' ? 'Copies' : 'Upvotes'}
                              </th>
                              <th className="py-3 px-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 text-sm">
                            {filteredEntries.map((entry) => (
                              <tr key={entry.id} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-3 px-4 max-w-xs">
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleQuickPatchEntry(entry.id, { featured: !entry.featured })
                                      }
                                      title={entry.featured ? 'Remove from featured' : 'Mark as featured'}
                                      className={`shrink-0 cursor-pointer ${
                                        entry.featured ? 'text-amber-500' : 'text-slate-300 hover:text-slate-500'
                                      }`}
                                    >
                                      <Star className="w-3.5 h-3.5 fill-current" />
                                    </button>
                                    <span className="font-medium text-slate-900 truncate">{entry.title}</span>
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-xs text-slate-600 whitespace-nowrap">
                                  {entry.category}
                                </td>
                                <td className="py-3 px-3 text-xs text-slate-600 whitespace-nowrap">
                                  {entry.author}
                                </td>
                                <td className="py-3 px-3 whitespace-nowrap">{renderStatusText(entry.status)}</td>
                                <td className="py-3 px-3 text-right font-mono text-xs text-slate-600 tabular-nums">
                                  {entry.views.toLocaleString()}
                                </td>
                                <td className="py-3 px-3 text-right font-mono text-xs text-slate-600 tabular-nums">
                                  {(activeTab === 'tips' ? entry.copies : entry.upvotes).toLocaleString()}
                                </td>
                                <td className="py-3 px-4 text-right whitespace-nowrap">
                                  <div className="inline-flex items-center gap-1.5">
                                    {entry.status !== 'published' ? (
                                      <button
                                        type="button"
                                        onClick={() => handleQuickPatchEntry(entry.id, { status: 'published' })}
                                        className="px-2.5 py-1 text-xs font-medium text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded cursor-pointer"
                                      >
                                        Publish
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => handleQuickPatchEntry(entry.id, { status: 'draft' })}
                                        className="px-2.5 py-1 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded cursor-pointer"
                                      >
                                        Unpublish
                                      </button>
                                    )}
                                    <button
                                      type="button"
                                      onClick={() => openEditEditor(entry)}
                                      aria-label={`Edit ${entry.title}`}
                                      className="p-1.5 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 cursor-pointer"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    {confirmDeleteId === entry.id ? (
                                      <span className="inline-flex items-center gap-1 ml-1">
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteEntry(entry.id)}
                                          className="px-2 py-1 text-[11px] font-medium bg-red-600 text-white rounded cursor-pointer"
                                        >
                                          Confirm
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setConfirmDeleteId(null)}
                                          className="px-2 py-1 text-[11px] text-slate-600 bg-slate-100 rounded cursor-pointer"
                                        >
                                          Cancel
                                        </button>
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteId(entry.id)}
                                        aria-label={`Delete ${entry.title}`}
                                        className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* COMMENTS MODERATION TAB */}
              {activeTab === 'comments' && (
                <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
                  <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
                    <h2 className="text-sm font-semibold text-slate-900">
                      Reader Notes ({comments.length})
                    </h2>
                  </div>
                  {comments.length === 0 ? (
                    <p className="p-8 text-sm text-slate-500 text-center">No comments recorded yet.</p>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {comments.map((cmt) => (
                        <div key={cmt.id} className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <span className="font-semibold text-slate-900">{cmt.author}</span>
                              <span aria-hidden="true">·</span>
                              <span>on {cmt.entryTitle}</span>
                              <span aria-hidden="true">·</span>
                              <span>{formatDate(cmt.createdAt)}</span>
                              <span aria-hidden="true">·</span>
                              <span className={cmt.approved ? 'text-emerald-700 font-medium' : 'text-amber-700 font-medium'}>
                                {cmt.approved ? 'Visible' : 'Hidden'}
                              </span>
                            </div>
                            <p className="text-sm text-slate-700 leading-relaxed">{cmt.body}</p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleToggleComment(cmt)}
                              className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md cursor-pointer"
                            >
                              {cmt.approved ? 'Hide' : 'Show'}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteComment(cmt.id)}
                              className="px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md cursor-pointer"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* CATEGORIES & SETTINGS TAB */}
              {activeTab === 'settings' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Site Settings */}
                  <form
                    onSubmit={handleSaveSettings}
                    className="bg-white border border-slate-200 rounded-lg p-6 space-y-5"
                  >
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">Publication Settings</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Configure your site identity and community moderation workflow.
                      </p>
                    </div>

                    <div>
                      <label htmlFor="set-title" className="block text-xs font-medium text-slate-700 mb-1.5">
                        Site Title
                      </label>
                      <input
                        id="set-title"
                        type="text"
                        value={settings.siteTitle}
                        onChange={(e) => setSettings({ ...settings, siteTitle: e.target.value })}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>

                    <div>
                      <label htmlFor="set-tagline" className="block text-xs font-medium text-slate-700 mb-1.5">
                        Footer Tagline
                      </label>
                      <textarea
                        id="set-tagline"
                        rows={2}
                        value={settings.siteTagline}
                        onChange={(e) => setSettings({ ...settings, siteTagline: e.target.value })}
                        className="w-full px-3.5 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                    </div>

                    <label className="flex items-start gap-3 p-3.5 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                      <input
                        type="checkbox"
                        checked={settings.requireApproval}
                        onChange={(e) => setSettings({ ...settings, requireApproval: e.target.checked })}
                        className="mt-0.5 w-4 h-4 rounded border-slate-300 text-slate-900"
                      />
                      <div>
                        <p className="text-sm font-medium text-slate-900">
                          Require Admin Approval for Community Submissions
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          When enabled, posts and tips shared by visitors go to the Review Queue before publishing.
                        </p>
                      </div>
                    </label>

                    <div className="flex items-center justify-between pt-2">
                      {settingsSavedNote ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                          <Check className="w-3.5 h-3.5" />
                          {settingsSavedNote}
                        </span>
                      ) : (
                        <span />
                      )}
                      <button
                        type="submit"
                        disabled={savingSettings}
                        className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
                      >
                        {savingSettings ? 'Saving...' : 'Save Settings'}
                      </button>
                    </div>
                  </form>

                  {/* Category Management */}
                  <div className="bg-white border border-slate-200 rounded-lg p-6 space-y-5">
                    <div>
                      <h2 className="text-base font-semibold text-slate-900">Topics & Categories</h2>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Add or remove categories available for blog posts and tricks & tips.
                      </p>
                    </div>

                    <form onSubmit={handleAddCategory} className="flex flex-col sm:flex-row gap-2">
                      <input
                        type="text"
                        required
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        placeholder="New category name"
                        className="flex-1 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 text-xs sm:text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Add Topic
                      </button>
                    </form>

                    <div className="divide-y divide-slate-100 border-t border-slate-200">
                      {categories.map((cat) => (
                        <div key={cat.id} className="py-3 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-slate-900">{cat.name}</p>
                            <p className="text-xs text-slate-500 tabular-nums">
                              {cat.count ?? 0} published entries
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => handleDeleteCategory(cat.id)}
                            aria-label={`Delete ${cat.name}`}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Admin Entry Composer / Editor Modal */}
      {editorOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 overflow-y-auto"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-2xl bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden my-8">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h2 className="text-base font-semibold text-slate-900">
                {editingEntry ? 'Edit Entry' : 'Create New Entry'}
              </h2>
              <button
                type="button"
                onClick={() => setEditorOpen(false)}
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEntry} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {editorError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700">
                  {editorError}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Format</label>
                  <select
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as 'blog' | 'tip')}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    <option value="blog">Blog Post</option>
                    <option value="tip">Trick & Tip</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value as EntryStatus)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    <option value="published">Published</option>
                    <option value="pending">Pending Review</option>
                    <option value="draft">Draft</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Category</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.name}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-700 mb-1">Title</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Author</label>
                  <input
                    type="text"
                    value={formAuthor}
                    onChange={(e) => setFormAuthor(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Excerpt</label>
                <input
                  type="text"
                  value={formExcerpt}
                  onChange={(e) => setFormExcerpt(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Body Content</label>
                <textarea
                  rows={6}
                  required
                  value={formContent}
                  onChange={(e) => setFormContent(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm leading-relaxed"
                />
              </div>

              {formType === 'tip' && (
                <div className="space-y-4 pt-3 border-t border-slate-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Difficulty</label>
                      <select
                        value={formDifficulty}
                        onChange={(e) =>
                          setFormDifficulty(e.target.value as 'Beginner' | 'Intermediate' | 'Advanced')
                        }
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                      >
                        <option value="Beginner">Beginner</option>
                        <option value="Intermediate">Intermediate</option>
                        <option value="Advanced">Advanced</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">Snippet Language</label>
                      <input
                        type="text"
                        value={formSnippetLang}
                        onChange={(e) => setFormSnippetLang(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-mono"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Steps (one per line)
                    </label>
                    <textarea
                      rows={3}
                      value={formStepsText}
                      onChange={(e) => setFormStepsText(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Code / Command Snippet</label>
                    <textarea
                      rows={3}
                      value={formSnippet}
                      onChange={(e) => setFormSnippet(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-900 text-slate-100 border border-slate-800 rounded-lg text-xs font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Cover Image</label>
                  <select
                    value={formCover}
                    onChange={(e) => setFormCover(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white"
                  >
                    {COVER_OPTIONS.map((opt) => (
                      <option key={opt.label} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <label className="flex items-center gap-2 text-sm text-slate-700 pt-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formFeatured}
                    onChange={(e) => setFormFeatured(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300"
                  />
                  <span>Feature on homepage</span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="px-4 py-2 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEntry}
                  className="px-4 py-2 text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 rounded-lg cursor-pointer"
                >
                  {savingEntry ? 'Saving...' : editingEntry ? 'Save Changes' : 'Create Entry'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
