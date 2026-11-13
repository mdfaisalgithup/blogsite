interface PublicHeaderProps {
  siteTitle: string;
  activeSection: 'home' | 'blog' | 'tip' | 'saved';
  onSelectSection: (section: 'home' | 'blog' | 'tip' | 'saved') => void;
  onOpenAdmin: () => void;
  onOpenSubmit: () => void;
}

export function PublicHeader({
  siteTitle,
  activeSection,
  onSelectSection,
  onOpenAdmin,
  onOpenSubmit,
}: PublicHeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-[#FBF9F5]/95 backdrop-blur-sm border-b border-stone-200">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single text element wordmark */}
        <button
          type="button"
          onClick={() => onSelectSection('home')}
          className="font-serif text-2xl font-semibold tracking-tight text-stone-900 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 rounded"
        >
          {siteTitle}
        </button>

        {/* Zone 2: 4 concise single-line nav links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-stone-600">
          <button
            type="button"
            onClick={() => onSelectSection('home')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
              activeSection === 'home'
                ? 'text-stone-900 border-emerald-900'
                : 'border-transparent hover:text-stone-900'
            }`}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => onSelectSection('blog')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
              activeSection === 'blog'
                ? 'text-stone-900 border-emerald-900'
                : 'border-transparent hover:text-stone-900'
            }`}
          >
            Blog Posts
          </button>
          <button
            type="button"
            onClick={() => onSelectSection('tip')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
              activeSection === 'tip'
                ? 'text-stone-900 border-emerald-900'
                : 'border-transparent hover:text-stone-900'
            }`}
          >
            Tricks & Tips
          </button>
          <button
            type="button"
            onClick={() => onSelectSection('saved')}
            className={`whitespace-nowrap shrink-0 py-1 border-b-2 transition-colors cursor-pointer ${
              activeSection === 'saved'
                ? 'text-stone-900 border-emerald-900'
                : 'border-transparent hover:text-stone-900'
            }`}
          >
            Saved
          </button>
          <button
            type="button"
            onClick={onOpenAdmin}
            className="whitespace-nowrap shrink-0 py-1 border-b-2 border-transparent hover:text-stone-900 transition-colors cursor-pointer"
          >
            Admin
          </button>
        </nav>

        {/* Zone 3: 1 primary CTA */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenAdmin}
            className="md:hidden px-3 py-2 text-xs font-medium text-stone-700 hover:text-stone-900 whitespace-nowrap shrink-0 cursor-pointer"
          >
            Admin
          </button>
          <button
            type="button"
            onClick={onOpenSubmit}
            className="px-4 py-2 text-xs sm:text-sm font-medium text-white bg-[#14532D] hover:bg-[#0F3F22] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-800 focus-visible:ring-offset-2"
          >
            Share Post
          </button>
        </div>
      </div>
    </header>
  );
}
