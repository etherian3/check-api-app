'use client';
import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, BarChart, Bar, Cell,
} from 'recharts';
import StatusBadge from '../../components/StatusBadge';
import { getApi, getApiStats, getApiHistory, triggerCheck, deleteApi, updateApi, Api, ApiStats, ApiCheck, ApiFormData } from '../../../lib/api';
import { RefreshCw, Zap, Trash2, Edit3, X, ChevronDown, ExternalLink } from 'lucide-react';

function formatDate(dt: string) {
    return new Date(dt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

const METHOD_COLORS: Record<string, string> = {
    GET: '#22d47e', POST: '#4a9eff', PUT: '#f5a623', PATCH: '#9b72f0', DELETE: '#f05e6a', HEAD: '#8fa3c0',
};

// ── Inline Edit Modal (reused from apis list) ─────────────────────────────────
function EditModal({ api, onClose, onSaved }: { api: Api; onClose: () => void; onSaved: (a: Api) => void }) {
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [form, setForm] = useState<ApiFormData>({
        name: api.name, description: api.description ?? '',
        category: api.category ?? '', base_url: api.base_url,
        method: api.method ?? 'GET',
        headers: api.headers ? JSON.stringify(api.headers, null, 2) : '',
        body: api.body ?? '',
        expected_status: api.expected_status ?? '',
        auth_required: api.auth_required ?? 'No',
    });
    function set(k: keyof ApiFormData, v: string) { setForm(f => ({ ...f, [k]: v })); }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault(); setError(null); setSaving(true);
        try {
            if (form.headers) { try { JSON.parse(form.headers as string); } catch { throw new Error('Headers must be valid JSON'); } }
            const saved = await updateApi(api.id, { ...form, expected_status: form.expected_status ? Number(form.expected_status) : undefined });
            onSaved(saved);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to save');
        } finally { setSaving(false); }
    }

    const inp: React.CSSProperties = {
        width: '100%', background: 'rgba(6,10,20,0.8)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '9px', color: 'var(--text-1)', padding: '9px 13px', fontSize: '13.5px',
        outline: 'none', fontFamily: 'inherit',
    };
    const lbl: React.CSSProperties = {
        display: 'block', fontSize: '11.5px', fontWeight: 600, letterSpacing: '.05em',
        textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '6px',
    };

    return (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
            onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div style={{ width: '100%', maxWidth: '580px', maxHeight: 'calc(100vh - 32px)', background: '#0c1120', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '18px', boxShadow: '0 24px 80px rgba(0,0,0,0.7)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
                onClick={e => e.stopPropagation()}>
                {/* ── Sticky header ── */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
                    <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>✏️ Edit API</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center' }}><X size={18} /></button>
                </div>
                {/* ── Scrollable form body ── */}
                <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '20px 22px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div><label style={lbl}>API Name *</label><input style={inp} value={form.name} onChange={e => set('name', e.target.value)} required /></div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '10px' }}>
                        <div><label style={lbl}>Endpoint URL *</label><input style={inp} value={form.base_url} onChange={e => set('base_url', e.target.value)} required type="url" /></div>
                        <div><label style={lbl}>Method *</label>
                            <select style={{ ...inp, cursor: 'pointer' }} value={form.method} onChange={e => set('method', e.target.value)}>
                                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'].map(m => <option key={m} value={m}>{m}</option>)}
                            </select>
                        </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div><label style={lbl}>Description</label><input style={inp} value={form.description} onChange={e => set('description', e.target.value)} /></div>
                        <div><label style={lbl}>Category</label><input style={inp} value={form.category} onChange={e => set('category', e.target.value)} /></div>
                    </div>
                    <button type="button" onClick={() => setShowAdvanced(v => !v)}
                        style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'var(--text-2)', cursor: 'pointer', padding: '8px 12px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit' }}>
                        <ChevronDown size={14} style={{ transform: showAdvanced ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                        {showAdvanced ? 'Hide' : 'Show'} Advanced Options
                    </button>
                    {showAdvanced && (<>
                        <div>
                            <label style={lbl}>Expected Status Code</label>
                            <input style={inp} type="number" placeholder="200 (leave blank for any 2xx/3xx)" value={form.expected_status} onChange={e => set('expected_status', e.target.value)} min="100" max="599" />
                        </div>
                        <div>
                            <label style={lbl}>Custom Headers (JSON)</label>
                            <textarea style={{ ...inp, minHeight: '80px', resize: 'vertical', fontFamily: 'ui-monospace, monospace', fontSize: '12.5px' }}
                                placeholder={'{"Authorization": "Bearer token"}'} value={form.headers} onChange={e => set('headers', e.target.value)} />
                        </div>
                        {['POST', 'PUT', 'PATCH'].includes(form.method) && (
                            <div>
                                <label style={lbl}>Request Body</label>
                                <textarea style={{ ...inp, minHeight: '80px', resize: 'vertical', fontFamily: 'ui-monospace, monospace', fontSize: '12.5px' }}
                                    placeholder='{"key": "value"}' value={form.body} onChange={e => set('body', e.target.value)} />
                            </div>
                        )}
                        <div>
                            <label style={lbl}>Auth Type</label>
                            <select style={{ ...inp, cursor: 'pointer' }} value={form.auth_required} onChange={e => set('auth_required', e.target.value)}>
                                {['No', 'API Key', 'Bearer', 'OAuth', 'Basic'].map(a => <option key={a} value={a}>{a === 'No' ? 'No Auth' : a}</option>)}
                            </select>
                        </div>
                    </>)}
                    {error && <div style={{ padding: '10px 13px', borderRadius: '9px', background: 'rgba(240,94,106,0.08)', border: '1px solid rgba(240,94,106,0.2)', color: '#f05e6a', fontSize: '12.5px' }}>{error}</div>}
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
                        <button type="submit" className="btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ApiDetailPage() {
    const { id } = useParams();
    const router = useRouter();
    const apiId = Number(id);

    const [api, setApi] = useState<Api | null>(null);
    const [stats, setStats] = useState<ApiStats | null>(null);
    const [history, setHistory] = useState<ApiCheck[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [checking, setChecking] = useState(false);
    const [checkResult, setCheckResult] = useState<{ success: boolean; msg: string } | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState(false);
    const [deleting, setDeleting] = useState(false);

    const load = useCallback(async (isBackground = false) => {
        try {
            if (!isBackground) setLoading(true);
            const [apiData, statsData, historyData] = await Promise.all([
                getApi(apiId),
                getApiStats(apiId),
                getApiHistory(apiId, 1, 60),
            ]);
            setApi(apiData as Api);
            setStats(statsData);
            setHistory(historyData.data);
        } catch (err: unknown) {
            if (!isBackground) setError(err instanceof Error ? err.message : 'Failed to load');
        } finally {
            if (!isBackground) setLoading(false);
        }
    }, [apiId]);

    useEffect(() => {
        load(false);
        const interval = setInterval(() => load(true), 15000);
        return () => clearInterval(interval);
    }, [load]);

    async function handleCheckNow() {
        setChecking(true); setCheckResult(null);
        try {
            const r = await triggerCheck(apiId);
            setCheckResult({ success: r.success, msg: r.success ? `✅ UP — ${r.statusCode} in ${r.latencyMs}ms` : `❌ ${r.statusCode ?? 'Error'} — ${r.latencyMs}ms` });
            load(true);
        } catch { setCheckResult({ success: false, msg: 'Check failed' }); }
        finally { setChecking(false); }
    }

    async function handleDelete() {
        setDeleting(true);
        try {
            await deleteApi(apiId);
            router.push('/apis');
        } catch { setDeleting(false); setDeleteConfirm(false); }
    }

    if (loading) return (
        <div style={{ padding: '60px', textAlign: 'center', color: 'var(--text-3)' }}>
            <RefreshCw size={32} style={{ margin: '0 auto 12px', display: 'block', animation: 'spin 1s linear infinite', opacity: 0.4 }} />
            Loading…
        </div>
    );
    if (error) return (
        <div style={{ padding: '60px', textAlign: 'center', color: '#f05e6a' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>❌</div>{error}
        </div>
    );
    if (!api) return null;

    const chartData = [...history].reverse().map((c, i) => ({
        time: formatDate(c.checked_at),
        latency: c.latency_ms,
        status: c.success ? 1 : 0,
        index: i,
    }));

    const currentStatus: 'UP' | 'DOWN' | 'UNKNOWN' =
        history.length > 0 ? (history[0].success ? 'UP' : 'DOWN') : 'UNKNOWN';

    const methodColor = METHOD_COLORS[api.method || 'GET'] ?? '#8fa3c0';

    return (
        <div style={{ padding: '32px', maxWidth: '1200px' }} className="fade-up">
            {/* Breadcrumb */}
            <div style={{ marginBottom: '20px', fontSize: '13px', color: 'var(--text-3)' }}>
                <Link href="/apis" style={{ color: 'var(--blue)', textDecoration: 'none' }}>← All APIs</Link>
            </div>

            {/* API Header */}
            <div className="g-card" style={{ padding: '24px 28px', marginBottom: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', flexWrap: 'wrap' }}>
                            {/* Method badge */}
                            <span style={{ padding: '3px 9px', borderRadius: '6px', background: `${methodColor}18`, color: methodColor, fontFamily: 'ui-monospace, monospace', fontSize: '12px', fontWeight: 700, letterSpacing: '.04em', border: `1px solid ${methodColor}25` }}>
                                {api.method || 'GET'}
                            </span>
                            <h1 style={{ fontSize: '22px', fontWeight: '700' }}>{api.name}</h1>
                            <StatusBadge status={currentStatus} />
                        </div>

                        {/* Endpoint URL */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                            <code style={{ fontSize: '12.5px', color: 'var(--text-2)', background: 'rgba(255,255,255,0.04)', padding: '4px 10px', borderRadius: '7px', border: '1px solid rgba(255,255,255,0.07)', wordBreak: 'break-all' }}>
                                {api.base_url}
                            </code>
                            <a href={api.base_url} target="_blank" rel="noreferrer" style={{ color: 'var(--text-3)', flexShrink: 0 }}>
                                <ExternalLink size={13} />
                            </a>
                        </div>

                        {api.description && <p style={{ color: 'var(--text-3)', fontSize: '13.5px', marginBottom: '12px' }}>{api.description}</p>}

                        {/* Tags */}
                        <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap' }}>
                            {api.category && (
                                <span style={{ padding: '3px 10px', borderRadius: '6px', background: 'rgba(139,92,246,0.12)', color: '#a78bfa', fontSize: '12px' }}>{api.category}</span>
                            )}
                            <span style={{ padding: '3px 10px', borderRadius: '6px', background: 'rgba(6,182,212,0.12)', color: 'var(--cyan)', fontSize: '12px' }}>
                                {api.https_supported ? 'HTTPS' : 'HTTP'}
                            </span>
                            {api.auth_required && api.auth_required !== 'No' && (
                                <span style={{ padding: '3px 10px', borderRadius: '6px', background: 'rgba(245,158,11,0.12)', color: 'var(--amber)', fontSize: '12px' }}>Auth: {api.auth_required}</span>
                            )}
                            {api.expected_status && (
                                <span style={{ padding: '3px 10px', borderRadius: '6px', background: 'rgba(74,158,255,0.1)', color: 'var(--blue)', fontSize: '12px' }}>
                                    Expects {api.expected_status}
                                </span>
                            )}
                            {api.headers && Object.keys(api.headers).length > 0 && (
                                <span style={{ padding: '3px 10px', borderRadius: '6px', background: 'rgba(155,114,240,0.1)', color: 'var(--purple)', fontSize: '12px' }}>
                                    {Object.keys(api.headers).length} custom header{Object.keys(api.headers).length > 1 ? 's' : ''}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0, alignItems: 'flex-end' }}>
                        {/* Check Now */}
                        <button className="btn-primary" onClick={handleCheckNow} disabled={checking} style={{ minWidth: '130px', justifyContent: 'center' }}>
                            <Zap size={14} style={{ animation: checking ? 'pulse-g 1s infinite' : 'none' }} />
                            {checking ? 'Checking…' : 'Check Now'}
                        </button>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button className="btn-ghost" onClick={() => setEditOpen(true)} style={{ fontSize: '12.5px', padding: '6px 12px' }}>
                                <Edit3 size={13} /> Edit
                            </button>
                            {deleteConfirm ? (
                                <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                                    <button onClick={handleDelete} disabled={deleting}
                                        style={{ fontSize: '12.5px', padding: '6px 12px', background: 'rgba(240,94,106,0.15)', border: '1px solid rgba(240,94,106,0.3)', borderRadius: '9px', color: '#f05e6a', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                                        {deleting ? '…' : 'Confirm Delete'}
                                    </button>
                                    <button onClick={() => setDeleteConfirm(false)} className="btn-ghost" style={{ padding: '6px 8px', fontSize: '12.5px' }}>
                                        <X size={13} />
                                    </button>
                                </div>
                            ) : (
                                <button className="btn-ghost" onClick={() => setDeleteConfirm(true)} style={{ fontSize: '12.5px', padding: '6px 12px', color: '#f05e6a', borderColor: 'rgba(240,94,106,0.2)' }}>
                                    <Trash2 size={13} /> Delete
                                </button>
                            )}
                        </div>
                        {/* Check result notification */}
                        {checkResult && (
                            <div style={{ fontSize: '12px', padding: '6px 10px', borderRadius: '8px', background: checkResult.success ? 'rgba(34,212,126,0.08)' : 'rgba(240,94,106,0.08)', border: `1px solid ${checkResult.success ? 'rgba(34,212,126,0.2)' : 'rgba(240,94,106,0.2)'}`, color: checkResult.success ? '#22d47e' : '#f05e6a', marginTop: '2px' }}>
                                {checkResult.msg}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '14px', marginBottom: '20px' }}>
                {[
                    { label: 'Uptime', value: stats?.uptime_percentage != null ? `${stats.uptime_percentage.toFixed(1)}%` : '—', color: '#22d47e' },
                    { label: 'Error Rate', value: stats?.error_rate != null ? `${stats.error_rate.toFixed(1)}%` : '—', color: '#f05e6a' },
                    { label: 'Avg Latency', value: stats?.avg_latency_ms != null ? `${stats.avg_latency_ms}ms` : '—', color: '#f5a623' },
                    { label: 'Min Latency', value: stats?.min_latency_ms != null ? `${stats.min_latency_ms}ms` : '—', color: '#05d0f5' },
                    { label: 'Max Latency', value: stats?.max_latency_ms != null ? `${stats.max_latency_ms}ms` : '—', color: '#9b72f0' },
                    { label: 'Total Checks', value: stats?.total_checks?.toLocaleString() ?? '0', color: '#4a9eff' },
                ].map(s => (
                    <div key={s.label} className="g-card" style={{ padding: '18px 16px' }}>
                        <div style={{ fontSize: '20px', fontWeight: '800', color: s.color, marginBottom: '4px', letterSpacing: '-0.02em' }}>{s.value}</div>
                        <div style={{ fontSize: '11.5px', color: 'var(--text-3)', fontWeight: 500 }}>{s.label}</div>
                    </div>
                ))}
            </div>

            {/* Charts */}
            {chartData.length > 0 ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px', marginBottom: '20px' }}>
                    <div className="g-card" style={{ padding: '22px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '18px', color: 'var(--text-2)' }}>⚡ Latency (ms)</h3>
                        <ResponsiveContainer width="100%" height={180}>
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="time" tick={{ fill: 'var(--text-3)', fontSize: 10 }} interval="preserveStartEnd" />
                                <YAxis tick={{ fill: 'var(--text-3)', fontSize: 10 }} />
                                <Tooltip contentStyle={{ background: '#0c1120', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--text-1)' }}
                                    formatter={(v) => [`${Number(v)}ms`, 'Latency']} />
                                <Line type="monotone" dataKey="latency" stroke="var(--blue)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                    <div className="g-card" style={{ padding: '22px' }}>
                        <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '18px', color: 'var(--text-2)' }}>📊 Check Results</h3>
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                                <XAxis dataKey="time" tick={{ fill: 'var(--text-3)', fontSize: 10 }} interval="preserveStartEnd" />
                                <YAxis domain={[0, 1]} ticks={[0, 1]} tick={{ fill: 'var(--text-3)', fontSize: 10 }} tickFormatter={v => v === 1 ? 'UP' : 'DN'} />
                                <Tooltip contentStyle={{ background: '#0c1120', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: 'var(--text-1)' }}
                                    formatter={(v) => [Number(v) === 1 ? 'UP' : 'DOWN', 'Status']} />
                                <Bar dataKey="status" radius={[3, 3, 0, 0]}>
                                    {chartData.map((entry, i) => <Cell key={i} fill={entry.status === 1 ? '#22d47e' : '#f05e6a'} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            ) : (
                <div className="g-card" style={{ padding: '40px', textAlign: 'center', color: 'var(--text-3)', marginBottom: '20px' }}>
                    <Zap size={28} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.3 }} />
                    No monitoring data yet — click <strong>Check Now</strong> or wait for the worker.
                </div>
            )}

            {/* History Table */}
            <div className="g-card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '600' }}>📋 Check History</h3>
                    <span style={{ marginLeft: 'auto', fontSize: '11.5px', color: 'var(--text-3)' }}>{history.length} records</span>
                </div>
                {history.length === 0 ? (
                    <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-3)' }}>No checks recorded yet.</div>
                ) : (
                    <table className="data-table">
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
                            {history.map(check => (
                                <tr key={check.id}>
                                    <td style={{ color: 'var(--text-3)', fontSize: '12px', fontFamily: 'ui-monospace, monospace' }}>
                                        {new Date(check.checked_at).toLocaleString()}
                                    </td>
                                    <td><StatusBadge status={check.success ? 'UP' : 'DOWN'} /></td>
                                    <td style={{ fontSize: '13px', fontFamily: 'ui-monospace, monospace', textAlign: 'center' }}>
                                        {check.status_code != null ? (
                                            <span style={{ color: check.status_code >= 200 && check.status_code < 400 ? '#22d47e' : '#f05e6a' }}>
                                                {check.status_code}
                                            </span>
                                        ) : '—'}
                                    </td>
                                    <td style={{ fontSize: '13px', textAlign: 'center' }}>{check.latency_ms != null ? `${check.latency_ms}ms` : '—'}</td>
                                    <td style={{ fontSize: '12px', color: '#f05e6a', maxWidth: '250px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {check.error_message || '—'}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {editOpen && <EditModal api={api} onClose={() => setEditOpen(false)} onSaved={saved => { setApi(prev => ({ ...prev!, ...saved })); setEditOpen(false); }} />}
        </div>
    );
}
