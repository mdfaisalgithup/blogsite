import { useEffect, useState } from 'react';
import { PublicSite } from './components/PublicSite.tsx';
import { AdminDashboard } from './components/AdminDashboard.tsx';

function parseRoute(pathname: string): { mode: 'public' | 'admin'; slug: string | null } {
  if (pathname === '/admin' || pathname.startsWith('/admin/')) {
    return { mode: 'admin', slug: null };
  }
  if (pathname.startsWith('/article/')) {
    const slug = decodeURIComponent(pathname.slice('/article/'.length)).replace(/\/+$/, '');
    return { mode: 'public', slug: slug || null };
  }
  return { mode: 'public', slug: null };
}

export default function App() {
  const [route, setRoute] = useState(() => parseRoute(window.location.pathname));

  useEffect(() => {
    const onPopState = () => {
      setRoute(parseRoute(window.location.pathname));
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  const navigate = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setRoute(parseRoute(path));
    window.scrollTo({ top: 0 });
  };

  if (route.mode === 'admin') {
    return <AdminDashboard onExitToPublic={() => navigate('/')} />;
  }

  return (
    <PublicSite
      selectedSlug={route.slug}
      onNavigateSlug={(slug) => navigate(slug ? `/article/${encodeURIComponent(slug)}` : '/')}
      onOpenAdmin={() => navigate('/admin')}
    />
  );
}
