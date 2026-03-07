'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';
import StatusBadge from '../../components/StatusBadge';
import { getApi, getApiStats, getApiHistory, Api, ApiStats, ApiCheck } from '../../../lib/api';

function formatDate(dt: string) {
    return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function ApiDetailPage() {
    const { id } = useParams();
    const apiId = Number(id);

    const [api, setApi] = useState<Api | null>(null);
    const [stats, setStats] = useState<ApiStats | null>(null);
    const [history, setHistory] = useState<ApiCheck[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        async function load(isBackground = false) {
            try {
                if (!isBackground) setLoading(true);
                const [apiData, statsData, historyData] = await Promise.all([
                    getApi(apiId),
                    getApiStats(apiId),
                    getApiHistory(apiId, 1, 50),
                ]);
                setApi(apiData as Api);
                setStats(statsData);
                setHistory(historyData.data);
            } catch (err: unknown) {
                if (!isBackground) setError(err instanceof Error ? err.message : 'Failed to load');
            } finally {
                if (!isBackground) setLoading(false);
            }
        }
        load(false);
        const interval = setInterval(() => load(true), 15000);
        return () => clearInterval(interval);
    }, [apiId]);

    if (loading) return (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>⏳</div> Loading…
        </div>
    );
    if (error) return (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--accent-red)' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>❌</div> {error}
        </div>
    );
    if (!api) return null;

    // Build chart data from history (oldest first)
    const chartData = [...history].reverse().map((c, i) => ({
        time: formatDate(c.checked_at),
        latency: c.latency_ms,
        status: c.success ? 1 : 0,
        index: i,
    }));

    const currentStatus: 'UP' | 'DOWN' | 'UNKNOWN' =
        history.length > 0
            ? (history[0].success ? 'UP' : 'DOWN')
            : 'UNKNOWN';

    return (
        <div style={{ padding: '32px' }}>
            {/* Breadcrumb */}
            <div style={{ marginBottom: '20px', fontSize: '13px', color: 'var(--text-muted)' }}>
                <Link href="/apis" style={{ color: 'var(--accent-blue)', textDecoration: 'none' }}>
                    ← All APIs
                </Link>
            </div>

            {/* API Header */}
            <div className="glass-card" style={{ padding: '28px', marginBottom: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <h1 style={{ fontSize: '24px', fontWeight: '700' }}>{api.name}</h1>
                            <StatusBadge status={currentStatus} />
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px', maxWidth: '600px' }}>
                            {api.description || 'No description'}
                        </p>
                        <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                            {api.category && (
                                <span style={{ padding: '3px 10px', borderRadius: '6px', background: 'rgba(139,92,246,0.12)', color: 'var(--accent-purple)', fontSize: '12px' }}>
                                    {api.category}
                                </span>
                            )}
                            <span style={{ padding: '3px 10px', borderRadius: '6px', background: 'rgba(6,182,212,0.12)', color: 'var(--accent-cyan)', fontSize: '12px' }}>
                                {api.https_supported ? 'HTTPS' : 'HTTP'}
                            </span>
                            {api.auth_required && api.auth_required !== 'No' && (
                                <span style={{ padding: '3px 10px', borderRadius: '6px', background: 'rgba(245,158,11,0.12)', color: 'var(--accent-yellow)', fontSize: '12px' }}>
                                    Auth: {api.auth_required}
                                </span>
                            )}
                        </div>
                    </div>
                    <a
                        href={api.base_url}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                            display: 'inline-flex', alignItems: 'center', gap: '6px',
                            padding: '8px 16px', borderRadius: '8px',
                            background: 'rgba(59,130,246,0.12)', color: 'var(--accent-blue)',
                            border: '1px solid rgba(59,130,246,0.25)',
                            textDecoration: 'none', fontSize: '13px', fontWeight: 500,
                            whiteSpace: 'nowrap',
                        }}
                    >
                        🔗 Visit API
                    </a>
                </div>
            </div>

            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                {[
                    { label: 'Uptime', value: stats?.uptime_percentage != null ? `${stats.uptime_percentage.toFixed(1)}%` : '—', color: '#10b981' },
                    { label: 'Error Rate', value: stats?.error_rate != null ? `${stats.error_rate.toFixed(1)}%` : '—', color: '#ef4444' },
                    { label: 'Avg Latency', value: stats?.avg_latency_ms != null ? `${stats.avg_latency_ms}ms` : '—', color: '#f59e0b' },
                    { label: 'Min Latency', value: stats?.min_latency_ms != null ? `${stats.min_latency_ms}ms` : '—', color: '#06b6d4' },
                    { label: 'Max Latency', value: stats?.max_latency_ms != null ? `${stats.max_latency_ms}ms` : '—', color: '#8b5cf6' },
                    { label: 'Total Checks', value: stats?.total_checks?.toLocaleString() ?? '0', color: '#3b82f6' },
                ].map(s => (
                    <div key={s.label} className="glass-card" style={{ padding: '20px' }}>
                        <div style={{ fontSize: '22px', fontWeight: '700', color: s.color, marginBottom: '4px' }}>
                            {s.value}
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Charts */}
            {chartData.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
                    {/* Latency Chart */}
                    <div className="glass-card" style={{ padding: '24px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '20px', color: 'var(--text-secondary)' }}>
                            ⚡ Latency History (ms)
                        </h3>
                        <ResponsiveContainer width="100%" height={200}>
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e2a45" />
                                <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 11 }} interval="preserveStartEnd" />
                                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                <Tooltip
                                    contentStyle={{ background: '#141b2d', border: '1px solid #1e2a45', borderRadius: '8px', color: '#e2e8f0' }}
                                    formatter={(v) => [`${Number(v)}ms`, 'Latency']}
                                />
                                <Line
                                    type="monotone" dataKey="latency"
                                    stroke="#3b82f6" strokeWidth={2}
                                    dot={false} activeDot={{ r: 4 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Uptime Chart */}
                    <div className="glass-card" style={{ padding: '24px' }}>
                        <h3 style={{ fontSize: '15px', fontWeight: '600', marginBottom: '20px', color: 'var(--text-secondary)' }}>
                            📊 Check Results (1=UP, 0=DOWN)
                        </h3>
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e2a45" />
                                <XAxis dataKey="time" tick={{ fill: '#94a3b8', fontSize: 11 }} interval="preserveStartEnd" />
                                <YAxis domain={[0, 1]} ticks={[0, 1]} tick={{ fill: '#94a3b8', fontSize: 11 }} />
                                <Tooltip
                                    contentStyle={{ background: '#141b2d', border: '1px solid #1e2a45', borderRadius: '8px', color: '#e2e8f0' }}
                                    formatter={(v) => [Number(v) === 1 ? 'UP' : 'DOWN', 'Status']}
                                />
                                <Bar dataKey="status" radius={[3, 3, 0, 0]}>
                                    {chartData.map((entry, i) => (
                                        <Cell key={i} fill={entry.status === 1 ? '#10b981' : '#ef4444'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            ) : (
                <div className="glass-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)', marginBottom: '24px' }}>
                    <div style={{ fontSize: '32px', marginBottom: '10px' }}>📡</div>
                    No monitoring data yet. The worker will check this API shortly.
                </div>
            )}

            {/* History Table */}
            <div className="glass-card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '20px', borderBottom: '1px solid var(--border)' }}>
                    <h3 style={{ fontSize: '15px', fontWeight: '600' }}>📋 Check History</h3>
                </div>
                {history.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                        No checks recorded yet.
                    </div>
                ) : (
                    <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Status</th>
                                <th>Status Code</th>
                                <th>Latency</th>
                                <th>Error</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.map((check) => (
                                <tr key={check.id}>
                                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                                        {new Date(check.checked_at).toLocaleString()}
                                    </td>
                                    <td><StatusBadge status={check.success ? 'UP' : 'DOWN'} size="sm" /></td>
                                    <td style={{ fontSize: '13px', fontFamily: 'monospace' }}>
                                        {check.status_code != null ? (
                                            <span style={{
                                                color: check.status_code >= 200 && check.status_code < 400
                                                    ? 'var(--accent-green)' : 'var(--accent-red)',
                                            }}>
                                                {check.status_code}
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td style={{ fontSize: '13px' }}>
                                        {check.latency_ms != null ? `${check.latency_ms}ms` : '—'}
                                    </td>
                                    <td style={{ fontSize: '12px', color: 'var(--accent-red)', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {check.error_message || '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
