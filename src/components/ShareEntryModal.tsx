import { useState, FormEvent } from 'react';
import { X, Check } from 'lucide-react';
import type { CategoryItem, Entry } from '../types.ts';

interface ShareEntryModalProps {
  open: boolean;
  categories: CategoryItem[];
  requireApproval: boolean;
  onClose: () => void;
  onSubmitted: (entry: Entry, status: string) => void;
}

const COVER_OPTIONS = [
  { label: 'No Cover Image', value: '' },
  { label: 'Sunlit Writing Desk', value: '/src/assets/images/hero_editorial_desk_1794545992527.jpg' },
  { label: 'Modern Studio Desk', value: '/src/assets/images/article_systems_craft_1794545991735.jpg' },
  { label: 'Quiet Study & Index Cards', value: '/src/assets/images/article_focus_ritual_1794545993226.jpg' },
  { label: 'Drafting Grid & Ruler', value: '/src/assets/images/article_design_grid_1794545993123.jpg' },
];

export function ShareEntryModal({
  open,
  categories,
  requireApproval,
  onClose,
  onSubmitted,
}: ShareEntryModalProps) {
  const [type, setType] = useState<'blog' | 'tip'>('blog');
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [category, setCategory] = useState(categories[0]?.name || 'Engineering');
  const [excerpt, setExcerpt] = useState('');
  const [content, setContent] = useState('');
  const [stepsText, setStepsText] = useState('');
  const [codeSnippet, setCodeSnippet] = useState('');
  const [snippetLanguage, setSnippetLanguage] = useState('bash');
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Beginner');
  const [coverImage, setCoverImage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  if (!open) return null;

  const resetForm = () => {
    setTitle('');
    setAuthor('');
    setExcerpt('');
    setContent('');
    setStepsText('');
    setCodeSnippet('');
    setCoverImage('');
    setError('');
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const steps =
        type === 'tip'
          ? stepsText
              .split('\n')
              .map((s) => s.trim())
              .filter(Boolean)
          : undefined;

      const res = await fetch('/api/entries/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          title,
          author,
          category,
          excerpt,
          content,
          steps,
          codeSnippet: type === 'tip' ? codeSnippet : undefined,
          snippetLanguage: type === 'tip' ? snippetLanguage : undefined,
          difficulty: type === 'tip' ? difficulty : undefined,
          coverImage: coverImage || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Could not submit entry.');
        setSubmitting(false);
        return;
      }

      onSubmitted(data.entry, data.status);
      setSuccessMsg(
        data.status === 'published'
          ? 'Your post is now live on the site.'
          : 'Submitted successfully. It will appear once approved by an admin.'
      );
      resetForm();
    } catch {
      setError('Network error while submitting. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/50 backdrop-blur-xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-entry-title"
    >
      <div className="w-full max-w-2xl bg-[#FBF9F5] border border-stone-200 rounded-xl shadow-xl overflow-hidden my-8">
        <div className="px-6 py-5 border-b border-stone-200 flex items-center justify-between gap-4 bg-white">
          <div>
            <h2 id="share-entry-title" className="font-serif text-xl font-semibold text-stone-900">
              Share a Blog Post or Trick & Tip
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              {requireApproval
                ? 'Submissions are reviewed by an editor before appearing publicly.'
                : 'Published entries appear immediately in the community feed.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close composer"
            className="p-2 text-stone-500 hover:text-stone-900 rounded-lg hover:bg-stone-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
          {/* Type Switcher */}
          <div>
            <label className="block text-xs font-medium text-stone-600 mb-2">Entry Format</label>
            <div className="inline-flex p-1 bg-stone-100 border border-stone-200 rounded-lg">
              <button
                type="button"
                onClick={() => setType('blog')}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  type === 'blog' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Blog Post
              </button>
              <button
                type="button"
                onClick={() => setType('tip')}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  type === 'tip' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Trick & Tip
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 border border-red-200 bg-red-50 text-red-800 text-sm rounded-lg">
              {error}
            </div>
          )}

          {successMsg && (
            <div className="p-3 border border-emerald-200 bg-emerald-50 text-emerald-900 text-sm rounded-lg flex items-center gap-2">
              <Check className="w-4 h-4 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label htmlFor="share-title" className="block text-xs font-medium text-stone-700 mb-1.5">
                Headline
              </label>
              <input
                id="share-title"
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={
                  type === 'blog'
                    ? 'e.g., Why Simple Data Models Outlast Clever Abstractions'
                    : 'e.g., Copy JSON Keys Quickly With jq in the Terminal'
                }
                className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-800"
              />
            </div>

            <div>
              <label htmlFor="share-author" className="block text-xs font-medium text-stone-700 mb-1.5">
                Your Name
              </label>
              <input
                id="share-author"
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="e.g., Nadia Rahman"
                className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-800"
              />
            </div>

            <div>
              <label htmlFor="share-category" className="block text-xs font-medium text-stone-700 mb-1.5">
                Category
              </label>
              <select
                id="share-category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-800"
              >
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="share-excerpt" className="block text-xs font-medium text-stone-700 mb-1.5">
              Short Summary
            </label>
            <input
              id="share-excerpt"
              type="text"
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="One or two sentences summarizing the takeaway..."
              className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-800"
            />
          </div>

          <div>
            <label htmlFor="share-content" className="block text-xs font-medium text-stone-700 mb-1.5">
              {type === 'blog' ? 'Full Article Body' : 'Explanation & Context'}
            </label>
            <textarea
              id="share-content"
              required
              rows={type === 'blog' ? 7 : 4}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={
                type === 'blog'
                  ? 'Write your essay paragraphs separated by blank lines...'
                  : 'Explain when to use this trick and why it saves time...'
              }
              className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-800 leading-relaxed"
            />
          </div>

          {type === 'tip' && (
            <div className="space-y-4 pt-2 border-t border-stone-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="share-difficulty" className="block text-xs font-medium text-stone-700 mb-1.5">
                    Difficulty Level
                  </label>
                  <select
                    id="share-difficulty"
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value as 'Beginner' | 'Intermediate' | 'Advanced')}
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-800"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="share-lang" className="block text-xs font-medium text-stone-700 mb-1.5">
                    Snippet Language
                  </label>
                  <input
                    id="share-lang"
                    type="text"
                    value={snippetLanguage}
                    onChange={(e) => setSnippetLanguage(e.target.value)}
                    placeholder="bash, typescript, css, sql..."
                    className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-800"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="share-steps" className="block text-xs font-medium text-stone-700 mb-1.5">
                  Step-by-Step Instructions (one step per line)
                </label>
                <textarea
                  id="share-steps"
                  rows={3}
                  value={stepsText}
                  onChange={(e) => setStepsText(e.target.value)}
                  placeholder={'Step 1: Open your terminal\nStep 2: Run the command\nStep 3: Verify the result'}
                  className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-emerald-800"
                />
              </div>

              <div>
                <label htmlFor="share-snippet" className="block text-xs font-medium text-stone-700 mb-1.5">
                  Copyable Command or Code Snippet (Optional)
                </label>
                <textarea
                  id="share-snippet"
                  rows={3}
                  value={codeSnippet}
                  onChange={(e) => setCodeSnippet(e.target.value)}
                  placeholder="git log --oneline -n 10"
                  className="w-full px-3.5 py-2.5 bg-stone-900 text-stone-100 border border-stone-800 rounded-lg text-xs font-mono placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-emerald-800"
                />
              </div>
            </div>
          )}

          {type === 'blog' && (
            <div>
              <label htmlFor="share-cover" className="block text-xs font-medium text-stone-700 mb-1.5">
                Editorial Cover Artwork
              </label>
              <select
                id="share-cover"
                value={coverImage}
                onChange={(e) => setCoverImage(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white border border-stone-200 rounded-lg text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-800"
              >
                {COVER_OPTIONS.map((opt) => (
                  <option key={opt.label} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="pt-3 border-t border-stone-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-stone-700 hover:text-stone-900 bg-white border border-stone-200 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-sm font-medium text-white bg-[#14532D] hover:bg-[#0F3F22] disabled:opacity-60 rounded-lg transition-colors cursor-pointer"
            >
              {submitting ? 'Publishing...' : type === 'blog' ? 'Publish Blog Post' : 'Share Trick & Tip'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
