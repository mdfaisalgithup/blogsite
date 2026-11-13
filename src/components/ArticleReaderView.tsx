import { useEffect, useState, FormEvent } from 'react';
import { ArrowLeft, Bookmark, Check, Copy, Heart, Share2 } from 'lucide-react';
import type { CommentItem, Entry } from '../types.ts';
import { EditorialImage } from './EditorialImage.tsx';

interface ArticleReaderViewProps {
  slugOrId: string;
  isBookmarked: boolean;
  onToggleBookmark: (id: string) => void;
  onBack: () => void;
  onEntryUpdated: (entry: Entry) => void;
}

export function ArticleReaderView({
  slugOrId,
  isBookmarked,
  onToggleBookmark,
  onBack,
  onEntryUpdated,
}: ArticleReaderViewProps) {
  const [entry, setEntry] = useState<Entry | null>(null);
  const [comments, setComments] = useState<CommentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [scrollProgress, setScrollProgress] = useState(0);

  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [upvoting, setUpvoting] = useState(false);
  const [hasUpvoted, setHasUpvoted] = useState(false);

  const [commentAuthor, setCommentAuthor] = useState('');
  const [commentBody, setCommentBody] = useState('');
  const [commentPending, setCommentPending] = useState(false);
  const [commentError, setCommentError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError('');
    fetch(`/api/entries/${encodeURIComponent(slugOrId)}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Entry not found');
        return res.json();
      })
      .then((data) => {
        if (!active) return;
        setEntry(data.entry);
        setComments(data.comments || []);
        onEntryUpdated(data.entry);
      })
      .catch(() => {
        if (active) setError('This article or tip could not be found.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [slugOrId]);

  useEffect(() => {
    const onScroll = () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) {
        setScrollProgress(0);
        return;
      }
      setScrollProgress(Math.min(100, Math.max(0, (window.scrollY / docHeight) * 100)));
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleUpvote = async () => {
    if (!entry || upvoting || hasUpvoted) return;
    setUpvoting(true);
    try {
      const res = await fetch(`/api/entries/${entry.id}/upvote`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        const next = { ...entry, upvotes: data.upvotes };
        setEntry(next);
        setHasUpvoted(true);
        onEntryUpdated(next);
      }
    } finally {
      setUpvoting(false);
    }
  };

  const handleCopySnippet = async () => {
    if (!entry?.codeSnippet) return;
    try {
      await navigator.clipboard.writeText(entry.codeSnippet);
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 1800);
      const res = await fetch(`/api/entries/${entry.id}/copy`, { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        const next = { ...entry, copies: data.copies };
        setEntry(next);
        onEntryUpdated(next);
      }
    } catch {
      // ignore clipboard errors
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1800);
    } catch {
      // ignore
    }
  };

  const handlePostComment = async (e: FormEvent) => {
    e.preventDefault();
    if (!entry) return;
    setCommentError('');
    if (commentBody.trim().length < 2) {
      setCommentError('Please write a brief comment before posting.');
      return;
    }
    setCommentPending(true);
    try {
      const res = await fetch(`/api/entries/${entry.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ author: commentAuthor, body: commentBody }),
      });
      const data = await res.json();
      if (!res.ok) {
        setCommentError(data.error || 'Could not post comment.');
        return;
      }
      setComments(data.comments || []);
      setCommentBody('');
    } catch {
      setCommentError('Network error while posting comment.');
    } finally {
      setCommentPending(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 space-y-6">
        <div className="h-4 w-32 bg-stone-200 rounded animate-pulse" />
        <div className="h-10 w-3/4 bg-stone-200 rounded animate-pulse" />
        <div className="h-64 w-full bg-stone-200 rounded-lg animate-pulse" />
      </div>
    );
  }

  if (error || !entry) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-20 text-center space-y-4">
        <h2 className="font-serif text-2xl font-semibold text-stone-900">{error || 'Not Found'}</h2>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#14532D] text-white rounded-lg cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Journal
        </button>
      </div>
    );
  }

  const paragraphs = entry.content.split(/\n\s*\n/).filter(Boolean);

  return (
    <article className="relative pb-20">
      {/* Thin editorial reading progress indicator */}
      <div className="fixed top-16 left-0 right-0 h-0.5 bg-stone-200 z-20">
        <div
          className="h-full bg-[#14532D] transition-[width] duration-150"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-10">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm font-medium text-stone-600 hover:text-stone-900 mb-8 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to all entries
        </button>

        {/* Clean unboxed editorial metadata */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-stone-500 mb-4">
          <span className="font-semibold text-emerald-900">
            {entry.type === 'tip' ? 'Trick & Tip' : 'Blog Post'}
          </span>
          <span aria-hidden="true">·</span>
          <span>{entry.category}</span>
          {entry.difficulty && (
            <>
              <span aria-hidden="true">·</span>
              <span>{entry.difficulty}</span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span>{formatDate(entry.createdAt)}</span>
          <span aria-hidden="true">·</span>
          <span>{entry.readTime}</span>
        </div>

        <h1 className="font-serif text-3xl sm:text-4xl lg:text-[2.65rem] font-semibold tracking-tight text-stone-900 leading-[1.15] text-balance mb-4">
          {entry.title}
        </h1>

        <p className="text-lg text-stone-600 leading-relaxed mb-6">{entry.excerpt}</p>

        <div className="flex flex-wrap items-center justify-between gap-4 py-4 border-y border-stone-200 mb-8">
          <div className="text-sm text-stone-700">
            By <span className="font-medium text-stone-900">{entry.author}</span>
            <span className="mx-2 text-stone-300">·</span>
            <span className="text-stone-500 tabular-nums">{entry.views.toLocaleString()} views</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleUpvote}
              disabled={hasUpvoted}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors cursor-pointer ${
                hasUpvoted
                  ? 'bg-emerald-900 text-white border-emerald-900'
                  : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              <span className="tabular-nums">Helpful ({entry.upvotes})</span>
            </button>
            <button
              type="button"
              onClick={() => onToggleBookmark(entry.id)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors cursor-pointer ${
                isBookmarked
                  ? 'bg-stone-900 text-white border-stone-900'
                  : 'bg-white text-stone-700 border-stone-200 hover:border-stone-400'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>{isBookmarked ? 'Saved' : 'Save'}</span>
            </button>
            <button
              type="button"
              onClick={handleCopyLink}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white text-stone-700 border border-stone-200 hover:border-stone-400 rounded-lg transition-colors cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-800" /> : <Share2 className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Link Copied' : 'Share'}</span>
            </button>
          </div>
        </div>

        {entry.coverImage && (
          <figure className="mb-10">
            <div className="overflow-hidden rounded-lg border border-stone-200 bg-stone-100 aspect-[16/9]">
              <EditorialImage
                src={entry.coverImage}
                alt={entry.title}
                type={entry.type}
                title={entry.title}
                className="w-full h-full object-cover"
              />
            </div>
            <figcaption className="text-xs font-serif italic text-stone-500 mt-2.5">
              Fig. 1 — {entry.title}
            </figcaption>
          </figure>
        )}

        {/* Main reading prose constrained to 65-75ch */}
        <div className="max-w-2xl space-y-6 text-[16.5px] leading-[1.78] text-stone-800">
          {paragraphs.map((para, idx) => (
            <p key={idx} className={idx === 0 && entry.type === 'blog' ? 'editorial-dropcap' : ''}>
              {para}
            </p>
          ))}
        </div>

        {/* Step-by-step section for Tricks & Tips */}
        {entry.steps && entry.steps.length > 0 && (
          <section className="max-w-2xl mt-10 pt-8 border-t border-stone-200">
            <h2 className="font-serif text-xl font-semibold text-stone-900 mb-4">Step-by-Step Guide</h2>
            <ol className="space-y-3">
              {entry.steps.map((step, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3.5 p-4 bg-white border border-stone-200 rounded-lg"
                >
                  <span className="font-mono text-xs font-semibold text-emerald-900 pt-0.5 tabular-nums shrink-0">
                    {String(index + 1).padStart(2, '0')}.
                  </span>
                  <span className="text-sm text-stone-800 leading-relaxed">{step}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Copyable snippet block */}
        {entry.codeSnippet && (
          <section className="max-w-2xl mt-8">
            <div className="rounded-lg border border-stone-800 bg-stone-950 overflow-hidden">
              <div className="px-4 py-2.5 border-b border-stone-800 flex items-center justify-between text-xs text-stone-400">
                <span className="font-mono">{entry.snippetLanguage || 'snippet'}</span>
                <button
                  type="button"
                  onClick={handleCopySnippet}
                  className="inline-flex items-center gap-1.5 text-stone-200 hover:text-white transition-colors cursor-pointer"
                >
                  {copiedSnippet ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSnippet ? 'Copied' : 'Copy Snippet'}</span>
                </button>
              </div>
              <pre className="p-4 text-xs sm:text-sm font-mono text-stone-100 overflow-x-auto leading-relaxed">
                <code>{entry.codeSnippet}</code>
              </pre>
            </div>
            <p className="text-xs text-stone-500 mt-2 tabular-nums">
              Copied {entry.copies.toLocaleString()} times by readers
            </p>
          </section>
        )}

        {/* Reader Discussion */}
        <section className="max-w-2xl mt-14 pt-10 border-t border-stone-200">
          <h2 className="font-serif text-2xl font-semibold text-stone-900 mb-2">
            Reader Notes ({comments.length})
          </h2>
          <p className="text-sm text-stone-500 mb-6">
            Share your own variation, question, or practical follow-up.
          </p>

          <form onSubmit={handlePostComment} className="bg-white border border-stone-200 rounded-lg p-5 space-y-4 mb-8">
            {commentError && <p className="text-xs text-red-700">{commentError}</p>}
            <div>
              <label htmlFor="comment-author" className="block text-xs font-medium text-stone-700 mb-1">
                Name
              </label>
              <input
                id="comment-author"
                type="text"
                value={commentAuthor}
                onChange={(e) => setCommentAuthor(e.target.value)}
                placeholder="Your name (optional)"
                className="w-full sm:w-64 px-3 py-2 bg-[#FBF9F5] border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-800"
              />
            </div>
            <div>
              <label htmlFor="comment-body" className="block text-xs font-medium text-stone-700 mb-1">
                Comment
              </label>
              <textarea
                id="comment-body"
                rows={3}
                required
                value={commentBody}
                onChange={(e) => setCommentBody(e.target.value)}
                placeholder="Write a thoughtful note..."
                className="w-full px-3 py-2 bg-[#FBF9F5] border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-800"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={commentPending}
                className="px-4 py-2 text-xs sm:text-sm font-medium text-white bg-[#14532D] hover:bg-[#0F3F22] rounded-lg transition-colors cursor-pointer"
              >
                {commentPending ? 'Posting...' : 'Post Note'}
              </button>
            </div>
          </form>

          {comments.length === 0 ? (
            <p className="text-sm text-stone-500 py-4">No reader notes yet. Be the first to add one.</p>
          ) : (
            <div className="divide-y divide-stone-200 border-t border-stone-200">
              {comments.map((cmt) => (
                <div key={cmt.id} className="py-5">
                  <div className="flex items-center gap-2 text-xs text-stone-500 mb-1.5">
                    <span className="font-medium text-stone-900">{cmt.author}</span>
                    <span aria-hidden="true">·</span>
                    <span>{formatDate(cmt.createdAt)}</span>
                  </div>
                  <p className="text-sm text-stone-700 leading-relaxed">{cmt.body}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </article>
  );
}
