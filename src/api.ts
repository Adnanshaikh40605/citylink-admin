const TOKEN_KEY = 'citylink_admin_token';

const PRODUCTION_API = 'https://city-link-production.up.railway.app';

export function getApiBase() {
  const fromEnv = import.meta.env.VITE_API_BASE_URL as string | undefined;
  if (fromEnv && fromEnv.trim()) return fromEnv.replace(/\/$/, '');
  // Local Vite proxy only. Production builds (Vercel) must call Railway.
  if (import.meta.env.DEV) return '/api';
  return PRODUCTION_API;
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${getApiBase()}${path}`, {
    ...options,
    headers,
  });

  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { error: text || 'Unexpected response.' };
  }

  if (!res.ok) {
    const message =
      typeof data === 'object' &&
      data &&
      'error' in data &&
      typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : `Request failed (${res.status})`;
    throw new ApiError(res.status, message);
  }

  return data as T;
}

export type AdminUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  profileImage?: string | null;
  role: 'USER' | 'ADMIN';
  status: string;
  createdAt: string;
  watchHistoryCount?: number;
};

export type PageResult<T> = {
  data: T[];
  page: number;
  limit: number;
  total: number;
  hasMore: boolean;
};

export type Tournament = {
  id: string;
  name: string;
  description: string;
  thumbnail: string;
  startDate: string;
  endDate: string;
  featured: boolean;
  published: boolean;
  matchCount?: number;
};

export type Match = {
  id: string;
  tournamentId: string;
  tournamentName: string;
  teamA: string;
  teamB: string;
  startAt: string;
  venue: string;
  thumbnail: string;
  description: string;
  status: string;
  youtubeVideoId: string | null;
  featured: boolean;
  published: boolean;
  photoCount?: number;
  photos?: Photo[];
};

export type Photo = {
  id: string;
  matchId: string;
  imageUrl: string;
  caption: string | null;
  sortOrder: number;
  published: boolean;
  matchTitle?: string;
};

export type NewsItem = {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  youtubeVideoId: string | null;
  publishedAt: string;
  featured: boolean;
  published: boolean;
};

export type DashboardTotals = {
  tournaments: number;
  upcomingMatches: number;
  liveMatches: number;
  completedMatches: number;
  publishedNews: number;
  users: number;
};
