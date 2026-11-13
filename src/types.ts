export type EntryType = 'blog' | 'tip';
export type EntryStatus = 'published' | 'pending' | 'draft';

export interface Entry {
  id: string;
  slug: string;
  type: EntryType;
  title: string;
  excerpt: string;
  content: string;
  steps?: string[];
  codeSnippet?: string;
  snippetLanguage?: string;
  category: string;
  author: string;
  readTime: string;
  difficulty?: 'Beginner' | 'Intermediate' | 'Advanced';
  coverImage?: string;
  status: EntryStatus;
  featured: boolean;
  views: number;
  upvotes: number;
  copies: number;
  createdAt: string;
  updatedAt: string;
}

export interface CommentItem {
  id: string;
  entryId: string;
  entryTitle?: string;
  author: string;
  body: string;
  approved: boolean;
  createdAt: string;
}

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  description: string;
  count?: number;
}

export interface SiteSettings {
  siteTitle: string;
  siteTagline: string;
  requireApproval: boolean;
}

export interface DashboardOverview {
  totalPosts: number;
  totalTips: number;
  pendingCount: number;
  draftCount: number;
  totalViews: number;
  totalUpvotes: number;
  totalComments: number;
  categoryBreakdown: Array<{ category: string; count: number; views: number }>;
  recentEntries: Entry[];
}
