import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Bookmark, Check, Copy, Heart, Search } from 'lucide-react';
import type { CategoryItem, Entry, SiteSettings } from '../types.ts';
import { PublicHeader } from './PublicHeader.tsx';
import { EditorialImage } from './EditorialImage.tsx';
import { ShareEntryModal } from './ShareEntryModal.tsx';
import { ArticleReaderView } from './ArticleReaderView.tsx';

interface PublicSiteProps {
  selectedSlug: string | null;
  onNavigateSlug: (slug: string | null) => void;
  onOpenAdmin: () => void;
}

const BOOKMARKS_KEY = 'fieldnote_bookmarks_v1';

export function PublicSite({ selectedSlug, onNavigateSlug, onOpenAdmin }: PublicSiteProps) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [settings, setSettings] = useState<SiteSettings>({
    siteTitle: 'Fieldnote',
    siteTagline: 'Thoughtful essays, engineering notes, and practical tricks & tips shared by builders.',
    requireApproval: false,
  });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [activeSection, setActiveSection] = useState<'home' | 'blog' | 'tip' | 'saved'>('home');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'latest' | 'popular'>('latest');
  const [searchQuery, setSearchQuery] = useState('');
  const [shareOpen, setShareOpen] = useState(false);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(BOOKMARKS_KEY);
      return raw ? (JSON.parse(raw) as string[]) : [];
    } catch {
      return [];
    }
  });

  const loadSiteData = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [entriesRes, catsRes, settingsRes] = await Promise.all([
        fetch('/api/entries'),
        fetch('/api/categories'),
        fetch('/api/settings/public'),
      ]);
      if (!entriesRes.ok) throw new Error('Failed to load entries');
      const [entriesData, catsData, settingsData] = await Promise.all([
        entriesRes.json(),
        catsRes.json(),
        settingsRes.json(),
      ]);
      setEntries(Array.isArray(entriesData) ? entriesData : []);
      setCategories(Array.isArray(catsData) ? catsData : []);
      if (settingsData?.siteTitle) setSettings(settingsData);
    } catch {
      setLoadError('Unable to load journal entries right now. Please refresh.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSiteData();
  }, []);

  const toggleBookmark = (id: string) => {
    setBookmarks((prev) => {
      const next = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const handleSelectSection = (section: 'home' | 'blog' | 'tip' | 'saved') => {
    setActiveSection(section);
    if (selectedSlug) {
      onNavigateSlug(null);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleQuickCopy = async (entry: Entry) => {
    if (!entry.codeSnippet) return;
    try {
      await navigator.clipboard.writeText(entry.codeSnippet);
      setCopiedId(entry.id);
      setTimeout(() => setCopiedId((cur) => (cur === entry.id ? null : cur)), 1800);
      const res = await fetch(`/api/entries/${entry.id}/copy`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, copies: data.copies } : e)));
      }
    } catch {
      // ignore clipboard errors
    }
  };

  const handleQuickUpvote = async (entry: Entry) => {
    try {
      const res = await fetch(`/api/entries/${entry.id}/upvote`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, upvotes: data.upvotes } : e)));
      }
    } catch {
      // ignore
    }
  };

  const leadStory = useMemo(() => {
    return entries.find((e) => e.type === 'blog' && e.featured) || entries.find((e) => e.type === 'blog') || null;
  }, [entries]);

  const filteredEntries = useMemo(() => {
    let list = [...entries];
    if (activeSection === 'blog') {
      list = list.filter((e) => e.type === 'blog');
    } else if (activeSection === 'tip') {
      list = list.filter((e) => e.type === 'tip');
    } else if (activeSection === 'saved') {
      list = list.filter((e) => bookmarks.includes(e.id));
    }

    if (selectedCategory !== 'all') {
      list = list.filter((e) => e.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.excerpt.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          e.author.toLowerCase().includes(q) ||
          (e.codeSnippet && e.codeSnippet.toLowerCase().includes(q))
      );
    }

    if (sortBy === 'popular') {
      list.sort((a, b) => b.upvotes * 3 + b.views - (a.upvotes * 3 + a.views));
    } else {
      list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    }

    return list;
  }, [entries, activeSection, selectedCategory, searchQuery, sortBy, bookmarks]);

  const blogEntries = useMemo(() => filteredEntries.filter((e) => e.type === 'blog'), [filteredEntries]);
  const tipEntries = useMemo(() => filteredEntries.filter((e) => e.type === 'tip'), [filteredEntries]);

  const totalBlogsCount = entries.filter((e) => e.type === 'blog').length;
  const totalTipsCount = entries.filter((e) => e.type === 'tip').length;

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="min-h-screen flex flex-col bg-[#FBF9F5] text-stone-900">
      <PublicHeader
        siteTitle={settings.siteTitle}
        activeSection={activeSection}
        onSelectSection={handleSelectSection}
        onOpenAdmin={onOpenAdmin}
        onOpenSubmit={() => setShareOpen(true)}
      />

      <main className="flex-1">
        {selectedSlug ? (
          <ArticleReaderView
            slugOrId={selectedSlug}
            isBookmarked={Boolean(entries.find((e) => e.slug === selectedSlug || e.id === selectedSlug)?.id && bookmarks.includes(entries.find((e) => e.slug === selectedSlug || e.id === selectedSlug)!.id))}
            onToggleBookmark={toggleBookmark}
            onBack={() => onNavigateSlug(null)}
            onEntryUpdated={(updated) =>
              setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
            }
          />
        ) : (
          <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12 space-y-12">
            {/* Tier 1: Lead Story Hero (shown on Home when no search active) */}
            {activeSection === 'home' && !searchQuery.trim() && selectedCategory === 'all' && leadStory && (
              <section aria-label="Featured Story" className="space-y-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
                  <div className="lg:col-span-6 flex flex-col justify-between py-2">
                    <div>
                      <div className="flex items-center gap-2 text-xs text-stone-500 mb-4">
                        <span className="font-semibold text-emerald-900">Lead Essay</span>
                        <span aria-hidden="true">·</span>
                        <span>{leadStory.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>{leadStory.readTime}</span>
                      </div>
                      <h1 className="font-serif text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold tracking-tight text-stone-900 leading-[1.12] text-balance mb-4">
                        {leadStory.title}
                      </h1>
                      <p className="text-base sm:text-lg text-stone-600 leading-relaxed max-w-xl mb-6">
                        {leadStory.excerpt}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-stone-200 flex flex-wrap items-center justify-between gap-4">
                      <div className="text-sm text-stone-600">
                        By <span className="font-medium text-stone-900">{leadStory.author}</span>
                        <span className="mx-2 text-stone-300">·</span>
                        <span>{formatDate(leadStory.createdAt)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onNavigateSlug(leadStory.slug)}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#14532D] hover:bg-[#0F3F22] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Read Essay
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-6">
                    <button
                      type="button"
                      onClick={() => onNavigateSlug(leadStory.slug)}
                      className="block w-full h-full min-h-[260px] sm:min-h-[340px] rounded-lg overflow-hidden border border-stone-200 bg-stone-100 group cursor-pointer text-left"
                    >
                      <EditorialImage
                        src={leadStory.coverImage}
                        alt={leadStory.title}
                        type={leadStory.type}
                        title={leadStory.title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                      />
                    </button>
                  </div>
                </div>

                {/* Operational 4-column Strip below Hero */}
                <div className="grid grid-cols-2 lg:grid-cols-4 border border-stone-200 rounded-lg bg-white divide-y lg:divide-y-0 lg:divide-x divide-stone-200">
                  <div className="p-4 sm:px-6">
                    <p className="text-xs text-stone-500">Published Essays</p>
                    <p className="font-serif text-2xl font-semibold text-stone-900 mt-1 tabular-nums">
                      {totalBlogsCount}
                    </p>
                  </div>
                  <div className="p-4 sm:px-6">
                    <p className="text-xs text-stone-500">Practical Tricks & Tips</p>
                    <p className="font-serif text-2xl font-semibold text-stone-900 mt-1 tabular-nums">
                      {totalTipsCount}
                    </p>
                  </div>
                  <div className="p-4 sm:px-6">
                    <p className="text-xs text-stone-500">Curated Topics</p>
                    <p className="font-serif text-2xl font-semibold text-stone-900 mt-1 tabular-nums">
                      {categories.length}
                    </p>
                  </div>
                  <div className="p-4 sm:px-6 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-xs text-stone-500">Community Sharing</p>
                      <p className="text-sm font-medium text-stone-900 mt-1">Open for Contributors</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShareOpen(true)}
                      className="px-3 py-1.5 text-xs font-medium text-emerald-900 border border-stone-200 hover:border-emerald-900 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      Contribute
                    </button>
                  </div>
                </div>
              </section>
            )}

            {/* Workspace Toolbar: Search, Type Filter & Category Filter */}
            <section aria-label="Filter journal and tips" className="space-y-4 pt-2 border-t border-stone-200">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pt-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search blog posts, tricks, or code snippets..."
                    className="w-full pl-10 pr-4 py-2 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-800"
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Interactive Format Tabs */}
                  <div className="inline-flex p-1 bg-stone-100 border border-stone-200 rounded-lg">
                    {(
                      [
                        { id: 'home', label: 'All Entries' },
                        { id: 'blog', label: 'Blog Posts' },
                        { id: 'tip', label: 'Tricks & Tips' },
                        { id: 'saved', label: `Saved (${bookmarks.length})` },
                      ] as const
                    ).map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveSection(tab.id)}
                        className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                          activeSection === tab.id
                            ? 'bg-white text-stone-900 shadow-xs'
                            : 'text-stone-600 hover:text-stone-900'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <select
                    aria-label="Sort entries"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as 'latest' | 'popular')}
                    className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-xs font-medium text-stone-700 focus:outline-none focus:ring-2 focus:ring-emerald-800 cursor-pointer"
                  >
                    <option value="latest">Latest First</option>
                    <option value="popular">Most Helpful</option>
                  </select>
                </div>
              </div>

              {/* Category Filter Buttons */}
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'bg-stone-900 text-white border-stone-900'
                      : 'bg-white text-stone-600 border-stone-200 hover:text-stone-900'
                  }`}
                >
                  All Topics
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.name)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      selectedCategory === cat.name
                        ? 'bg-stone-900 text-white border-stone-900'
                        : 'bg-white text-stone-600 border-stone-200 hover:text-stone-900'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </section>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-72 bg-stone-200/60 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : loadError ? (
              <div className="p-8 bg-white border border-stone-200 rounded-lg text-center space-y-3">
                <p className="text-sm text-stone-700">{loadError}</p>
                <button
                  type="button"
                  onClick={loadSiteData}
                  className="px-4 py-2 text-xs font-medium bg-[#14532D] text-white rounded-lg cursor-pointer"
                >
                  Retry
                </button>
              </div>
            ) : filteredEntries.length === 0 ? (
              <div className="p-12 bg-white border border-stone-200 rounded-lg text-center space-y-3">
                <h3 className="font-serif text-xl font-semibold text-stone-900">
                  {activeSection === 'saved' ? 'No saved articles yet' : 'No matching posts or tips'}
                </h3>
                <p className="text-sm text-stone-500 max-w-md mx-auto">
                  {activeSection === 'saved'
                    ? 'Bookmark any blog post or trick & tip while reading to keep it in your personal shelf.'
                    : 'Try clearing your search filter or be the first to share an entry in this topic.'}
                </p>
                <div className="pt-2 flex items-center justify-center gap-3">
                  {(searchQuery || selectedCategory !== 'all' || activeSection === 'saved') && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('all');
                        setActiveSection('home');
                      }}
                      className="px-4 py-2 text-xs font-medium text-stone-700 border border-stone-200 rounded-lg hover:bg-stone-50 cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShareOpen(true)}
                    className="px-4 py-2 text-xs font-medium text-white bg-[#14532D] hover:bg-[#0F3F22] rounded-lg cursor-pointer"
                  >
                    Share Post
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-14">
                {/* Tier 2: Blog Posts Section */}
                {blogEntries.length > 0 && (
                  <section aria-label="Blog Posts" className="space-y-6">
                    <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                      <div>
                        <h2 className="font-serif text-2xl font-semibold text-stone-900">
                          Editorial Blog Posts
                        </h2>
                        <p className="text-sm text-stone-500 mt-0.5">
                          Long-form essays, engineering field notes, and system reflections.
                        </p>
                      </div>
                      <span className="text-xs text-stone-500 tabular-nums">
                        {blogEntries.length} {blogEntries.length === 1 ? 'article' : 'articles'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
                      {blogEntries.map((post) => {
                        const saved = bookmarks.includes(post.id);
                        return (
                          <article
                            key={post.id}
                            className="flex flex-col bg-white border border-stone-200 rounded-lg overflow-hidden transition-colors hover:border-stone-300"
                          >
                            <button
                              type="button"
                              onClick={() => onNavigateSlug(post.slug)}
                              className="block aspect-[4/3] w-full overflow-hidden bg-stone-100 border-b border-stone-200 cursor-pointer text-left"
                            >
                              <EditorialImage
                                src={post.coverImage}
                                alt={post.title}
                                type="blog"
                                title={post.title}
                                className="w-full h-full object-cover transition-transform duration-300 hover:scale-[1.03]"
                              />
                            </button>

                            <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                              <div>
                                <div className="flex items-center gap-2 text-xs text-stone-500 mb-2">
                                  <span className="font-medium text-emerald-900">{post.category}</span>
                                  <span aria-hidden="true">·</span>
                                  <span>{formatDate(post.createdAt)}</span>
                                  <span aria-hidden="true">·</span>
                                  <span>{post.readTime}</span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => onNavigateSlug(post.slug)}
                                  className="text-left cursor-pointer group"
                                >
                                  <h3 className="font-serif text-xl font-semibold text-stone-900 leading-snug group-hover:text-emerald-900 transition-colors text-balance">
                                    {post.title}
                                  </h3>
                                </button>

                                <p className="text-sm text-stone-600 leading-relaxed mt-2 line-clamp-3">
                                  {post.excerpt}
                                </p>
                              </div>

                              <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                                <span className="font-medium text-stone-700">{post.author}</span>
                                <div className="flex items-center gap-3">
                                  <button
                                    type="button"
                                    onClick={() => handleQuickUpvote(post)}
                                    className="inline-flex items-center gap-1 hover:text-emerald-900 transition-colors cursor-pointer tabular-nums"
                                    aria-label={`Upvote ${post.title}`}
                                  >
                                    <Heart className="w-3.5 h-3.5" />
                                    {post.upvotes}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => toggleBookmark(post.id)}
                                    className={`inline-flex items-center gap-1 transition-colors cursor-pointer ${
                                      saved ? 'text-stone-900 font-medium' : 'hover:text-stone-900'
                                    }`}
                                    aria-label={saved ? 'Remove bookmark' : 'Bookmark article'}
                                  >
                                    <Bookmark className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Tier 3: Tricks & Tips Action Section */}
                {tipEntries.length > 0 && (
                  <section aria-label="Tricks and Tips" className="space-y-6">
                    <div className="flex items-baseline justify-between border-b border-stone-200 pb-3">
                      <div>
                        <h2 className="font-serif text-2xl font-semibold text-stone-900">
                          Practical Tricks & Tips
                        </h2>
                        <p className="text-sm text-stone-500 mt-0.5">
                          Bite-sized workflows, commands, and repeatable shortcuts ready to copy and apply.
                        </p>
                      </div>
                      <span className="text-xs text-stone-500 tabular-nums">
                        {tipEntries.length} {tipEntries.length === 1 ? 'tip' : 'tips'}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {tipEntries.map((tip) => {
                        const saved = bookmarks.includes(tip.id);
                        const isCopied = copiedId === tip.id;
                        return (
                          <article
                            key={tip.id}
                            className="bg-white border border-stone-200 rounded-lg p-5 sm:p-6 flex flex-col justify-between gap-4 hover:border-stone-300 transition-colors"
                          >
                            <div className="space-y-3">
                              <div className="flex items-center justify-between gap-3 text-xs text-stone-500">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-emerald-900">{tip.category}</span>
                                  {tip.difficulty && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span>{tip.difficulty}</span>
                                    </>
                                  )}
                                  <span aria-hidden="true">·</span>
                                  <span>{tip.readTime}</span>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => toggleBookmark(tip.id)}
                                  className={`p-1 rounded transition-colors cursor-pointer ${
                                    saved ? 'text-stone-900' : 'text-stone-400 hover:text-stone-700'
                                  }`}
                                  aria-label={saved ? 'Remove bookmark' : 'Bookmark tip'}
                                >
                                  <Bookmark className="w-4 h-4" />
                                </button>
                              </div>

                              <button
                                type="button"
                                onClick={() => onNavigateSlug(tip.slug)}
                                className="text-left cursor-pointer group block"
                              >
                                <h3 className="font-serif text-lg sm:text-xl font-semibold text-stone-900 group-hover:text-emerald-900 transition-colors leading-snug text-balance">
                                  {tip.title}
                                </h3>
                              </button>

                              <p className="text-sm text-stone-600 leading-relaxed">{tip.excerpt}</p>

                              {tip.codeSnippet && (
                                <div className="rounded-md border border-stone-800 bg-stone-950 overflow-hidden">
                                  <div className="px-3 py-1.5 border-b border-stone-800 flex items-center justify-between text-[11px] text-stone-400">
                                    <span className="font-mono">{tip.snippetLanguage || 'snippet'}</span>
                                    <button
                                      type="button"
                                      onClick={() => handleQuickCopy(tip)}
                                      className="inline-flex items-center gap-1 text-stone-200 hover:text-white cursor-pointer"
                                    >
                                      {isCopied ? (
                                        <Check className="w-3 h-3 text-emerald-400" />
                                      ) : (
                                        <Copy className="w-3 h-3" />
                                      )}
                                      <span>{isCopied ? 'Copied' : 'Copy'}</span>
                                    </button>
                                  </div>
                                  <pre className="p-3 text-xs font-mono text-stone-100 overflow-x-auto leading-relaxed max-h-28">
                                    <code>{tip.codeSnippet}</code>
                                  </pre>
                                </div>
                              )}
                            </div>

                            <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                              <div className="flex items-center gap-3">
                                <span className="font-medium text-stone-700">{tip.author}</span>
                                <span aria-hidden="true">·</span>
                                <button
                                  type="button"
                                  onClick={() => handleQuickUpvote(tip)}
                                  className="inline-flex items-center gap-1 hover:text-emerald-900 cursor-pointer tabular-nums"
                                >
                                  <Heart className="w-3.5 h-3.5" />
                                  {tip.upvotes}
                                </button>
                                {tip.codeSnippet && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span className="tabular-nums">{tip.copies} copies</span>
                                  </>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => onNavigateSlug(tip.slug)}
                                className="inline-flex items-center gap-1 font-medium text-emerald-900 hover:underline cursor-pointer whitespace-nowrap shrink-0"
                              >
                                Read Steps
                                <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="border-t border-stone-200 bg-white mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-stone-500">
          <div>
            <p className="font-serif text-base font-semibold text-stone-900">{settings.siteTitle}</p>
            <p className="mt-1 max-w-md">{settings.siteTagline}</p>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <button
              type="button"
              onClick={() => handleSelectSection('blog')}
              className="hover:text-stone-900 cursor-pointer"
            >
              Blog Posts
            </button>
            <button
              type="button"
              onClick={() => handleSelectSection('tip')}
              className="hover:text-stone-900 cursor-pointer"
            >
              Tricks & Tips
            </button>
            <button
              type="button"
              onClick={() => setShareOpen(true)}
              className="hover:text-stone-900 cursor-pointer"
            >
              Share Entry
            </button>
            <button
              type="button"
              onClick={onOpenAdmin}
              className="font-medium text-stone-800 hover:text-emerald-900 cursor-pointer"
            >
              Admin Dashboard
            </button>
          </div>
        </div>
      </footer>

      <ShareEntryModal
        open={shareOpen}
        categories={categories}
        requireApproval={settings.requireApproval}
        onClose={() => setShareOpen(false)}
        onSubmitted={(entry, status) => {
          if (status === 'published') {
            setEntries((prev) => [entry, ...prev]);
          }
        }}
      />
    </div>
  );
}
