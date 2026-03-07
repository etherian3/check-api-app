'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, Filter, RefreshCw, ArrowRight, HelpCircle } from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import LiveIndicator from '../components/LiveIndicator';
import { getApis, getCategories, Api } from '../../lib/api';
import { useSSE } from '../../lib/useSSE';

export default function ApisPage() {
    const { status } = useSSE();
    const [apis, setApis] = useState<Api[]>([]);
    const [categories, setCategories] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [category, setCategory] = useState('');
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [total, setTotal] = useState(0);
    const [refreshing, setRefreshing] = useState(false);

    const loadApis = useCallback(async (isBackground = false) => {
        try {
            if (!isBackground) setLoading(true);
            const result = await getApis({ search, category, page, limit: 30 });
            setApis(result.data);
            setTotalPages(result.pagination.total_pages);
            setTotal(result.pagination.total);
        } catch { setApis([]); }
        finally { if (!isBackground) setLoading(false); }
    }, [search, category, page]);

    useEffect(() => { loadApis(false); }, [loadApis]);
    useEffect(() => { getCategories().then(r => setCategories(r.categories)).catch(() => { }); }, []);
    useEffect(() => {
        const i = setInterval(() => loadApis(true), 8000);
        return () => clearInterval(i);
    }, [loadApis]);

    async function handleRefresh() {
        setRefreshing(true);
        await loadApis();
        setTimeout(() => setRefreshing(false), 600);
    }

    return (
        <div className="fade-up" style={{ padding: '32px', maxWidth: '1300px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '26px', fontWeight: '700', letterSpacing: '-0.02em', marginBottom: '5px' }}>
                        <span className="gradient-text">Monitored</span> APIs
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '13.5px' }}>
                        {total.toLocaleString()} APIs tracked · updates every 8s
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <LiveIndicator status={status} />
                    <button className="btn-ghost" onClick={handleRefresh} disabled={refreshing}>
                        <RefreshCw size={14} style={{ animation: refreshing ? 'spin 0.6s linear' : 'none' }} />
                        Refresh
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1', minWidth: '220px', maxWidth: '360px' }}>
                    <Search size={14} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input
                        className="capi-input"
                        placeholder="Search APIs…"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        style={{ width: '100%', paddingLeft: '34px' }}
                    />
                </div>
                <div style={{ position: 'relative' }}>
                    <Filter size={13} color="var(--text-muted)" style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <select
                        className="capi-input"
                        value={category}
                        onChange={e => { setCategory(e.target.value); setPage(1); }}
                        style={{ paddingLeft: '30px', minWidth: '170px' }}
                    >
                        <option value="">All Categories</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="glass-card" style={{ overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '70px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <RefreshCw size={28} style={{ margin: '0 auto 12px', display: 'block', animation: 'spin 1s linear infinite', opacity: 0.4 }} />
                        Loading APIs…
                    </div>
                ) : apis.length === 0 ? (
                    <div style={{ padding: '70px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        <HelpCircle size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
                        <div style={{ marginBottom: '6px', fontSize: '14px' }}>No APIs found</div>
                        <div style={{ fontSize: '12.5px' }}>Import APIs from the dashboard first</div>
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left' }}>API Name</th>
                                <th style={{ textAlign: 'left' }}>Category</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'left' }}>Uptime</th>
                                <th>Avg Latency</th>
                                <th>Last Check</th>
                                <th>Auth</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {apis.map(api => (
                                <tr key={api.id}>
                                    <td>
                                        <Link href={`/apis/${api.id}`} style={{ color: '#60a5fa', textDecoration: 'none', fontWeight: 500, fontSize: '13.5px' }}>
                                            {api.name}
                                        </Link>
                                        {api.description && (
                                            <div style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '2px', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {api.description}
                                            </div>
                                        )}
                                    </td>
                                    <td>
                                        <span style={{ padding: '2px 8px', borderRadius: '5px', background: 'rgba(139,92,246,0.1)', color: '#a78bfa', fontSize: '11.5px', fontWeight: 500 }}>
                                            {api.category || '—'}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <StatusBadge status={api.current_status} />
                                    </td>
                                    <td>
                                        {api.uptime_percentage != null ? (
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: '100px' }}>
                                                <div className="uptime-bar" style={{ width: '52px' }}>
                                                    <div className="uptime-bar-fill" style={{
                                                        width: `${api.uptime_percentage}%`,
                                                        background: api.uptime_percentage >= 90 ? 'var(--accent-green)' : api.uptime_percentage >= 70 ? 'var(--accent-yellow)' : 'var(--accent-red)',
                                                    }} />
                                                </div>
                                                <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                                                    {api.uptime_percentage.toFixed(1)}%
                                                </span>
                                            </div>
                                        ) : (
                                            <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'center', fontSize: '12.5px', color: api.avg_latency_ms ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                                        {api.avg_latency_ms != null ? `${api.avg_latency_ms}ms` : '—'}
                                    </td>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '11.5px' }}>
                                        {api.last_checked_at ? new Date(api.last_checked_at).toLocaleTimeString() : '—'}
                                    </td>
                                    <td>
                                        {api.auth_required && api.auth_required !== 'No' ? (
                                            <span style={{ padding: '2px 7px', borderRadius: '5px', background: 'rgba(245,158,11,0.1)', color: '#fbbf24', fontSize: '11px', fontWeight: 500 }}>
                                                {api.auth_required}
                                            </span>
                                        ) : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>}
                                    </td>
                                    <td>
                                        <Link href={`/apis/${api.id}`} style={{ color: 'var(--text-muted)', display: 'inline-flex', transition: 'color 0.15s' }}
                                            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#60a5fa')}
                                            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-muted)')}>
                                            <ArrowRight size={15} />
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* Pagination */}
                {totalPages > 1 && !loading && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', padding: '14px', borderTop: '1px solid var(--border)' }}>
                        <button className="btn-ghost" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '5px 12px', fontSize: '12.5px' }}>
                            ← Prev
                        </button>
                        <span style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                            Page {page} of {totalPages}
                        </span>
                        <button className="btn-ghost" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '5px 12px', fontSize: '12.5px' }}>
                            Next →
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
