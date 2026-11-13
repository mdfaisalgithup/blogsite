import { useState } from 'react';
import { BookOpen, Terminal } from 'lucide-react';

interface EditorialImageProps {
  src?: string;
  alt: string;
  type?: 'blog' | 'tip';
  title?: string;
  className?: string;
}

export function EditorialImage({ src, alt, type = 'blog', title, className = '' }: EditorialImageProps) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-stone-100 via-stone-50 to-stone-200/70 border border-stone-200 text-stone-500 p-6 ${className}`}
        role="img"
        aria-label={alt}
      >
        {type === 'tip' ? (
          <Terminal className="w-7 h-7 text-emerald-900/60 mb-2" strokeWidth={1.5} />
        ) : (
          <BookOpen className="w-7 h-7 text-stone-400 mb-2" strokeWidth={1.5} />
        )}
        {title && (
          <p className="font-serif text-sm text-stone-600 text-center line-clamp-2 max-w-xs">{title}</p>
        )}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
