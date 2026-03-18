'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
    Search, Filter, RefreshCw, ArrowRight, HelpCircle, Plus, X,
    Trash2, Edit3, ChevronDown
} from 'lucide-react';
import StatusBadge from '../components/StatusBadge';
import LiveIndicator from '../components/LiveIndicator';
import { getApis, getCategories, createApi, updateApi, deleteApi, Api, ApiFormData } from '../../lib/api';
import { useSSE } from '../../lib/useSSE';

// ── Method badge ──────────────────────────────────────────────────────────────
const METHOD_COLORS: Record<string, { bg: string; color: string }> = {
    GET:    { bg: 'rgba(34,212,126,0.1)',  color: '#22d47e' },
    POST:   { bg: 'rgba(74,158,255,0.1)',  color: '#4a9eff' },
    PUT:    { bg: 'rgba(245,166,35,0.1)',  color: '#f5a623' },
    PATCH:  { bg: 'rgba(155,114,240,0.1)', color: '#9b72f0' },
    DELETE: { bg: 'rgba(240,94,106,0.1)', color: '#f05e6a' },
    HEAD:   { bg: 'rgba(143,163,192,0.1)', color: '#8fa3c0' },
};

function MethodBadge({ method }: { method: string }) {
    const m = (method || 'GET').toUpperCase();
    const c = METHOD_COLORS[m] ?? METHOD_COLORS.GET;
    return (
        <span style={{
            padding: '2px 7px', borderRadius: '5px', fontSize: '10.5px', fontWeight: 700,
            letterSpacing: '.05em', fontFamily: 'ui-monospace, monospace',
            background: c.bg, color: c.color
        }}>{m}</span>
    );
}

// ── API Form Modal ────────────────────────────────────────────────────────────
interface ModalProps {
    initial?: Api | null;
    onClose: () => void;
    onSaved: (api: Api) => void;
}

function ApiModal({ initial, onClose, onSaved }: ModalProps) {
    const isEdit = !!initial;
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);

    const [form, setForm] = useState<ApiFormData>({
        name: initial?.name ?? '',
        description: initial?.description ?? '',
        category: initial?.category ?? '',
        base_url: initial?.base_url ?? '',
        method: initial?.method ?? 'GET',
        headers: initial?.headers ? JSON.stringify(initial.headers, null, 2) : '',
        body: initial?.body ?? '',
        expected_status: initial?.expected_status ?? '',
        auth_required: initial?.auth_required ?? 'No',
    });

    function set(key: keyof ApiFormData, value: string) {
        setForm(f => ({ ...f, [key]: value }));
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setSaving(true);
        try {
            // Validate headers JSON
            if (form.headers) {
                try { JSON.parse(form.headers as string); } catch {
                    throw new Error('Custom Headers must be valid JSON (e.g. {"key": "value"})');
                }
            }
            const payload: ApiFormData = {
                ...form,
                expected_status: form.expected_status ? Number(form.expected_status) : undefined,
            };
            const saved = isEdit
                ? await updateApi(initial!.id, payload)
                : await createApi(payload);
            onSaved(saved);
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Failed to save');
        } finally {
            setSaving(false);
        }
    }

    const inputStyle: React.CSSProperties = {
        width: '100%', background: 'rgba(6,10,20,0.8)', border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '9px', color: 'var(--text-1)', padding: '9px 13px', fontSize: '13.5px',
        outline: 'none', fontFamily: 'inherit', transition: 'border-color .18s',
    };
    const labelStyle: React.CSSProperties = {
        display: 'block', fontSize: '11.5px', fontWeight: 600, letterSpacing: '.05em',
        textTransform: 'uppercase', color: 'var(--text-3)', marginBottom: '6px',
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
        }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    width: '100%', maxWidth: '580px',
                    maxHeight: 'calc(100vh - 32px)',
                    background: '#0c1120', border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '18px', boxShadow: '0 24px 80px rgba(0,0,0,0.7)',
                    display: 'flex', flexDirection: 'column', overflow: 'hidden',
                }}>
                {/* ── Sticky header ── */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', flexShrink: 0 }}>
                    <h2 style={{ fontSize: '16px', fontWeight: '700', margin: 0 }}>
                        {isEdit ? '✏️ Edit API' : '➕ Add API Endpoint'}
                    </h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: '4px', display: 'flex', alignItems: 'center', borderRadius: '6px' }}>
                        <X size={18} />
                    </button>
                </div>

                {/* ── Scrollable form body ── */}
                <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '20px 22px 22px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Name */}
                    <div>
                        <label style={labelStyle}>API Name *</label>
                        <input style={inputStyle} placeholder="e.g. JSONPlaceholder Todos" value={form.name}
                            onChange={e => set('name', e.target.value)} required />
                    </div>

                    {/* URL + Method */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: '10px' }}>
                        <div>
                            <label style={labelStyle}>Endpoint URL *</label>
                            <input style={inputStyle} placeholder="https://api.example.com/v1/status"
                                value={form.base_url} onChange={e => set('base_url', e.target.value)} required type="url" />
                        </div>
                        <div>
                            <label style={labelStyle}>Method *</label>
                            <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.method}
                                onChange={e => set('method', e.target.value)}>
                                {['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD'].map(m =>
                                    <option key={m} value={m}>{m}</option>
                                )}
                            </select>
                        </div>
                    </div>

                    {/* Description + Category */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                        <div>
                            <label style={labelStyle}>Description</label>
                            <input style={inputStyle} placeholder="What does this API do?" value={form.description}
                                onChange={e => set('description', e.target.value)} />
                        </div>
                        <div>
                            <label style={labelStyle}>Category</label>
                            <input style={inputStyle} placeholder="e.g. Data, Auth, Payment" value={form.category}
                                onChange={e => set('category', e.target.value)} />
                        </div>
                    </div>

                    {/* Advanced toggle */}
                    <button type="button" onClick={() => setShowAdvanced(v => !v)}
                        style={{ background: 'none', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '8px', color: 'var(--text-2)', cursor: 'pointer', padding: '8px 12px', fontSize: '12.5px', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit', transition: 'all .15s' }}>
                        <ChevronDown size={14} style={{ transition: 'transform .2s', transform: showAdvanced ? 'rotate(180deg)' : 'none' }} />
                        {showAdvanced ? 'Hide' : 'Show'} Advanced Options
                    </button>

                    {showAdvanced && (
                        <>
                            {/* Expected Status */}
                            <div>
                                <label style={labelStyle}>Expected Status Code</label>
                                <input style={inputStyle} type="number" placeholder="200 (leave blank for any 2xx/3xx)"
                                    value={form.expected_status} onChange={e => set('expected_status', e.target.value)} min="100" max="599" />
                                <p style={{ fontSize: '11.5px', color: 'var(--text-3)', marginTop: '5px' }}>
                                    If set, only this exact status code counts as success.
                                </p>
                            </div>

                            {/* Custom Headers */}
                            <div>
                                <label style={labelStyle}>Custom Headers (JSON)</label>
                                <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical', fontFamily: 'ui-monospace, monospace', fontSize: '12.5px' }}
                                    placeholder={'{\n  "Authorization": "Bearer token",\n  "X-Api-Key": "your-key"\n}'}
                                    value={form.headers} onChange={e => set('headers', e.target.value)} />
                            </div>

                            {/* Request Body */}
                            {['POST', 'PUT', 'PATCH'].includes(form.method) && (
                                <div>
                                    <label style={labelStyle}>Request Body</label>
                                    <textarea style={{ ...inputStyle, minHeight: '80px', resize: 'vertical', fontFamily: 'ui-monospace, monospace', fontSize: '12.5px' }}
                                        placeholder='{"key": "value"}'
                                        value={form.body} onChange={e => set('body', e.target.value)} />
                                </div>
                            )}

                            {/* Auth Required */}
                            <div>
                                <label style={labelStyle}>Auth Type</label>
                                <select style={{ ...inputStyle, cursor: 'pointer' }} value={form.auth_required}
                                    onChange={e => set('auth_required', e.target.value)}>
                                    <option value="No">No Auth</option>
                                    <option value="API Key">API Key</option>
                                    <option value="Bearer">Bearer Token</option>
                                    <option value="OAuth">OAuth</option>
                                    <option value="Basic">Basic Auth</option>
                                </select>
                            </div>
                        </>
                    )}

                    {/* Error */}
                    {error && (
                        <div style={{ padding: '10px 13px', borderRadius: '9px', background: 'rgba(240,94,106,0.08)', border: '1px solid rgba(240,94,106,0.2)', color: '#f05e6a', fontSize: '12.5px' }}>
                            {error}
                        </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '4px' }}>
                        <button type="button" onClick={onClose} className="btn-ghost">Cancel</button>
                        <button type="submit" className="btn-primary" disabled={saving}>
                            {saving ? (isEdit ? 'Saving…' : 'Adding…') : (isEdit ? 'Save Changes' : 'Add API')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
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

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingApi, setEditingApi] = useState<Api | null>(null);

    // Delete confirm
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

    const loadApis = useCallback(async (isBackground = false) => {
        try {
            if (!isBackground) setLoading(true);
            const result = await getApis({ search, category, page, limit: 30 });
            setApis(result.data);
            setTotalPages(result.pagination.total_pages);
            setTotal(result.pagination.total);
        } catch {
            // Don't clear apis on background fetch error — silently ignore
            if (!isBackground) setApis([]);
        }
        finally { if (!isBackground) setLoading(false); }
    }, [search, category, page]);

    useEffect(() => { loadApis(false); }, [loadApis]);
    useEffect(() => { getCategories().then(r => setCategories(r.categories)).catch(() => { }); }, []);
    // Pause background polling when modal is open to avoid overwriting optimistic edits
    useEffect(() => {
        if (modalOpen) return;
        const i = setInterval(() => loadApis(true), 8000);
        return () => clearInterval(i);
    }, [loadApis, modalOpen]);

    async function handleRefresh() {
        setRefreshing(true);
        await loadApis();
        setTimeout(() => setRefreshing(false), 600);
    }

    function openAdd() { setEditingApi(null); setModalOpen(true); }
    function openEdit(api: Api) { setEditingApi(api); setModalOpen(true); }

    function handleSaved(_saved: Api) {
        setModalOpen(false);
        // Reload fresh from server so state is always accurate
        loadApis(false);
    }

    async function handleDelete(id: number) {
        setDeletingId(id);
        try {
            await deleteApi(id);
            setApis(prev => prev.filter(a => a.id !== id));
            setDeleteConfirmId(null);
        } catch (err) {
            alert(err instanceof Error ? err.message : 'Delete failed');
        } finally {
            setDeletingId(null);
        }
    }

    return (
        <div className="fade-up" style={{ padding: '32px', maxWidth: '1300px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ fontSize: '26px', fontWeight: '700', letterSpacing: '-0.02em', marginBottom: '5px' }}>
                        <span className="gt-blue">Monitored</span> APIs
                    </h1>
                    <p style={{ color: 'var(--text-3)', fontSize: '13.5px' }}>
                        {total.toLocaleString()} APIs tracked · updates every 8s
                    </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <LiveIndicator status={status} />
                    <button className="btn-ghost" onClick={handleRefresh} disabled={refreshing}>
                        <RefreshCw size={14} style={{ animation: refreshing ? 'spin 0.6s linear' : 'none' }} />
                        Refresh
                    </button>
                    <button className="btn-primary" onClick={openAdd}>
                        <Plus size={14} /> Add API
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', flex: '1', minWidth: '220px', maxWidth: '360px' }}>
                    <Search size={14} color="var(--text-3)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                    <input
                        className="capi-input"
                        placeholder="Search APIs…"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        style={{ width: '100%', paddingLeft: '34px' }}
                    />
                </div>
                <div style={{ position: 'relative' }}>
                    <Filter size={13} color="var(--text-3)" style={{ position: 'absolute', left: '11px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
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
            <div className="g-card" style={{ overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '70px', textAlign: 'center', color: 'var(--text-3)' }}>
                        <RefreshCw size={28} style={{ margin: '0 auto 12px', display: 'block', animation: 'spin 1s linear infinite', opacity: 0.4 }} />
                        Loading APIs…
                    </div>
                ) : apis.length === 0 ? (
                    <div style={{ padding: '70px', textAlign: 'center', color: 'var(--text-3)' }}>
                        <HelpCircle size={32} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.3 }} />
                        <div style={{ marginBottom: '6px', fontSize: '14px' }}>
                            {search || category ? 'No APIs match your filter' : 'No APIs yet'}
                        </div>
                        {!search && !category && (
                            <button className="btn-primary" onClick={openAdd} style={{ marginTop: '14px' }}>
                                <Plus size={14} /> Add your first API
                            </button>
                        )}
                    </div>
                ) : (
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th style={{ textAlign: 'left' }}>API Name</th>
                                <th>Method</th>
                                <th style={{ textAlign: 'left' }}>Category</th>
                                <th>Status</th>
                                <th style={{ textAlign: 'left' }}>Uptime</th>
                                <th>Avg Latency</th>
                                <th>Last Check</th>
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
                                            <div style={{ fontSize: '11.5px', color: 'var(--text-3)', marginTop: '2px', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {api.description}
                                            </div>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <MethodBadge method={api.method || 'GET'} />
                                    </td>
                                    <td>
                                        {api.category ? (
                                            <span style={{ padding: '2px 8px', borderRadius: '5px', background: 'rgba(139,92,246,0.1)', color: '#a78bfa', fontSize: '11.5px', fontWeight: 500 }}>
                                                {api.category}
                                            </span>
                                        ) : <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>—</span>}
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
                                                        background: api.uptime_percentage >= 90 ? 'var(--green)' : api.uptime_percentage >= 70 ? 'var(--amber)' : 'var(--red)',
                                                    }} />
                                                </div>
                                                <span style={{ fontSize: '12.5px', color: 'var(--text-2)' }}>
                                                    {api.uptime_percentage.toFixed(1)}%
                                                </span>
                                            </div>
                                        ) : (
                                            <span style={{ color: 'var(--text-3)', fontSize: '12px' }}>—</span>
                                        )}
                                    </td>
                                    <td style={{ textAlign: 'center', fontSize: '12.5px', color: api.avg_latency_ms ? 'var(--text-2)' : 'var(--text-3)' }}>
                                        {api.avg_latency_ms != null ? `${api.avg_latency_ms}ms` : '—'}
                                    </td>
                                    <td style={{ color: 'var(--text-3)', fontSize: '11.5px' }}>
                                        {api.last_checked_at ? new Date(api.last_checked_at).toLocaleTimeString() : '—'}
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            {/* Edit */}
                                            <button onClick={() => openEdit(api)}
                                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '5px', borderRadius: '6px', transition: 'all .15s', display: 'flex' }}
                                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(74,158,255,0.1)'; (e.currentTarget as HTMLElement).style.color = '#4a9eff'; }}
                                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}
                                                title="Edit API">
                                                <Edit3 size={13} />
                                            </button>
                                            {/* Delete */}
                                            {deleteConfirmId === api.id ? (
                                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                    <button onClick={() => handleDelete(api.id)} disabled={deletingId === api.id}
                                                        style={{ fontSize: '11px', padding: '3px 8px', background: 'rgba(240,94,106,0.15)', border: '1px solid rgba(240,94,106,0.3)', borderRadius: '6px', color: '#f05e6a', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                                                        {deletingId === api.id ? '…' : 'Confirm'}
                                                    </button>
                                                    <button onClick={() => setDeleteConfirmId(null)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '3px', display: 'flex' }}>
                                                        <X size={13} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button onClick={() => setDeleteConfirmId(api.id)}
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-3)', padding: '5px', borderRadius: '6px', transition: 'all .15s', display: 'flex' }}
                                                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(240,94,106,0.1)'; (e.currentTarget as HTMLElement).style.color = '#f05e6a'; }}
                                                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = 'var(--text-3)'; }}
                                                    title="Delete API">
                                                    <Trash2 size={13} />
                                                </button>
                                            )}
                                            {/* Detail */}
                                            <Link href={`/apis/${api.id}`} style={{ color: 'var(--text-3)', display: 'inline-flex', transition: 'color 0.15s', padding: '5px' }}
                                                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#60a5fa')}
                                                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--text-3)')}>
                                                <ArrowRight size={13} />
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}

                {/* Pagination */}
                {totalPages > 1 && !loading && (
                    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', padding: '14px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <button className="btn-ghost" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ padding: '5px 12px', fontSize: '12.5px' }}>
                            ← Prev
                        </button>
                        <span style={{ fontSize: '12.5px', color: 'var(--text-3)' }}>
                            Page {page} of {totalPages}
                        </span>
                        <button className="btn-ghost" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ padding: '5px 12px', fontSize: '12.5px' }}>
                            Next →
                        </button>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {modalOpen && (
                <ApiModal
                    initial={editingApi}
                    onClose={() => setModalOpen(false)}
                    onSaved={handleSaved}
                />
            )}
        </div>
    );
}
