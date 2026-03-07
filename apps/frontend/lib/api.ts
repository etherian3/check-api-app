const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

async function fetchAPI<T>(endpoint: string): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`API error: ${res.status}`);
    return res.json();
}

export interface Api {
    id: number;
    name: string;
    description: string;
    category: string;
    auth_required: string;
    https_supported: boolean;
    base_url: string;
    created_at: string;
    total_checks: number;
    successful_checks: number;
    avg_latency_ms: number | null;
    current_status: 'UP' | 'DOWN' | 'UNKNOWN';
    last_checked_at: string | null;
    uptime_percentage: number | null;
}

export interface ApiStats {
    api_id: number;
    total_checks: number;
    successful_checks: number;
    failed_checks: number;
    uptime_percentage: number | null;
    error_rate: number | null;
    avg_latency_ms: number | null;
    min_latency_ms: number | null;
    max_latency_ms: number | null;
    last_checked_at: string | null;
}

export interface ApiCheck {
    id: number;
    api_id: number;
    status_code: number | null;
    latency_ms: number | null;
    success: boolean;
    error_message: string | null;
    checked_at: string;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        total_pages: number;
    };
}

export interface OverviewStats {
    total_apis: string;
    total_checks: string;
    up_count: string;
    down_count: string;
    unknown_count: string;
    avg_latency_ms: string | null;
}

export interface RecentActivity {
    id: number;
    api_id: number;
    success: boolean;
    status_code: number | null;
    latency_ms: number | null;
    error_message: string | null;
    checked_at: string;
    api_name: string;
    category: string;
}

export interface CategoryStat {
    category: string;
    total: string;
    up: string;
    down: string;
}

export async function getApis(params?: {
    search?: string;
    category?: string;
    page?: number;
    limit?: number;
}): Promise<PaginatedResponse<Api>> {
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.category) qs.set('category', params.category);
    if (params?.page) qs.set('page', String(params.page));
    if (params?.limit) qs.set('limit', String(params.limit));
    const q = qs.toString() ? `?${qs}` : '';
    return fetchAPI(`/apis${q}`);
}

export async function getApi(id: number): Promise<Api> {
    return fetchAPI(`/apis/${id}`);
}

export async function getApiStats(id: number): Promise<ApiStats> {
    return fetchAPI(`/apis/${id}/stats`);
}

export async function getApiHistory(id: number, page = 1, limit = 50): Promise<PaginatedResponse<ApiCheck>> {
    return fetchAPI(`/apis/${id}/history?page=${page}&limit=${limit}`);
}

export async function getCategories(): Promise<{ categories: string[] }> {
    return fetchAPI('/apis/categories');
}

export async function getOverviewStats(): Promise<OverviewStats> {
    return fetchAPI('/stats/overview');
}

export async function getRecentActivity(): Promise<{ data: RecentActivity[] }> {
    return fetchAPI('/stats/recent-activity');
}

export async function getCategoryStats(): Promise<{ data: CategoryStat[] }> {
    return fetchAPI('/stats/categories');
}

export async function importApis(): Promise<{
    message: string; imported: number; skipped: number; total: number;
}> {
    const res = await fetch(`${API_BASE}/import-apis`, { method: 'POST' });
    if (!res.ok) throw new Error('Import failed');
    return res.json();
}
