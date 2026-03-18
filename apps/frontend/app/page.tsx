'use client';
import Link from 'next/link';
import { Globe, TrendingUp, TrendingDown, Zap, Activity, CheckCircle2, XCircle, HelpCircle, Plus, ArrowRight } from 'lucide-react';
import { useSSE } from '../lib/useSSE';
import LiveIndicator from './components/LiveIndicator';

function timeAgo(dt: string) {
  const d = Date.now() - new Date(dt).getTime(), s = Math.floor(d / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  return `${Math.floor(m / 60)}h ago`;
}

/** SVG Donut ring for overall uptime */
function UptimeRing({ pct }: { pct: number }) {
  const r = 44, circ = 2 * Math.PI * r, dash = (pct / 100) * circ;
  const color = pct >= 90 ? '#22d47e' : pct >= 70 ? '#f5a623' : '#f05e6a';
  return (
    <div style={{ position: 'relative', width: 110, height: 110, flexShrink: 0 }}>
      <svg width="110" height="110" viewBox="0 0 110 110" style={{ transform: 'rotate(-90deg)' }}>
        <circle cx="55" cy="55" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="10" />
        <circle cx="55" cy="55" r={r} fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: 'stroke-dasharray .8s cubic-bezier(.4,0,.2,1)', filter: `drop-shadow(0 0 6px ${color}60)` }} />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ fontSize: '20px', fontWeight: '800', color, letterSpacing: '-0.02em', lineHeight: 1 }}>{pct.toFixed(1)}%</div>
        <div style={{ fontSize: '9.5px', color: 'var(--text-3)', marginTop: '3px', fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase' }}>Uptime</div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, status } = useSSE();

  const stats = data?.overview ?? null;
  const activity = data?.activity ?? [];
  const categories = data?.categories ?? [];

  const total = Number(stats?.total_apis ?? 0);
  const up = Number(stats?.up_count ?? 0);
  const down = Number(stats?.down_count ?? 0);
  const unk = Number(stats?.unknown_count ?? 0);
  const uptimePct = (up + down) > 0 ? (up / (up + down)) * 100 : 0;

  const cards = [
    { label: 'Total APIs', value: total, Icon: Globe, col: '#4a9eff', g: 'g-blue' },
    { label: 'APIs Up', value: up, Icon: TrendingUp, col: '#22d47e', g: 'g-green' },
    { label: 'APIs Down', value: down, Icon: TrendingDown, col: '#f05e6a', g: 'g-red' },
    { label: 'Not Checked', value: unk, Icon: HelpCircle, col: '#8fa3c0', g: 'g-slate' },
    { label: 'Avg Latency', value: stats?.avg_latency_ms ? `${Math.round(Number(stats.avg_latency_ms))}ms` : '—', Icon: Zap, col: '#f5a623', g: 'g-amber' },
  ];

  return (
    <div className="fade-up" style={{ padding: '28px 32px', maxWidth: '1180px', margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '26px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: '800', letterSpacing: '-0.025em', color: 'var(--text-1)' }}>
            <span className="gt-blue">Monitoring</span> Dashboard
          </h1>
          <p style={{ color: 'var(--text-3)', fontSize: '13px', marginTop: '4px' }}>
            Real-time health for your APIs — updates every 5s
          </p>
        </div>
        <LiveIndicator status={status} />
      </div>

      {/* ── Top row: stat cards + uptime ring ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto', gap: '12px', marginBottom: '20px', alignItems: 'stretch' }}>
        {cards.map((c) => (
          <div key={c.label} className={`g-card g-card-hover ${c.g}`} style={{ padding: '20px 18px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: `${c.col}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px' }}>
              <c.Icon size={17} color={c.col} strokeWidth={1.9} />
            </div>
            <div style={{ fontSize: typeof c.value === 'string' ? '22px' : '28px', fontWeight: '800', color: c.col, letterSpacing: '-0.025em', lineHeight: 1, marginBottom: '6px' }}>
              {typeof c.value === 'number' ? c.value.toLocaleString() : c.value}
            </div>
            <div style={{ fontSize: '11.5px', color: 'var(--text-3)', fontWeight: 500 }}>{c.label}</div>
          </div>
        ))}

        {/* Uptime ring card */}
        {(up + down) > 0 && (
          <div className="g-card" style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <UptimeRing pct={uptimePct} />
          </div>
        )}
      </div>

      {/* ── Middle row: Add API + Categories ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '14px', marginBottom: '20px' }}>

        {/* Add API card */}
        <div className="g-card" style={{ padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
            <div className="icon-ring" style={{ background: 'rgba(74,158,255,0.1)' }}>
              <Plus size={17} color="var(--blue)" strokeWidth={1.9} />
            </div>
            <div style={{ fontSize: '15px', fontWeight: '700' }}>Monitor an API</div>
          </div>
          <p style={{ color: 'var(--text-3)', fontSize: '13px', marginBottom: '18px', lineHeight: 1.65 }}>
            Add any REST API endpoint manually — set a custom method, headers, and expected status code for precise monitoring.
          </p>
          <Link href="/apis" className="btn-primary" style={{ textDecoration: 'none', display: 'inline-flex' }}>
            <Plus size={14} /> Add API Endpoint
          </Link>
        </div>

        {/* Categories card */}
        <div className="g-card" style={{ padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '18px' }}>
            <div className="icon-ring" style={{ background: 'rgba(155,114,240,0.1)' }}>
              <Activity size={17} color="var(--purple)" strokeWidth={1.9} />
            </div>
            <div style={{ fontSize: '15px', fontWeight: '700' }}>Top Categories</div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {categories.slice(0, 6).map(c => {
              const t = Number(c.total), u = Number(c.up);
              const pct = t > 0 ? (u / t) * 100 : 0;
              const barCol = pct >= 80 ? 'var(--green)' : pct >= 50 ? 'var(--amber)' : 'var(--red)';
              return (
                <div key={c.category} className="cat-row">
                  <span className="cat-name">{c.category}</span>
                  <div className="pbar" style={{ flex: 1 }}>
                    <div className="pbar-fill" style={{ width: `${pct}%`, background: barCol, boxShadow: `0 0 6px ${barCol}50` }} />
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-3)', width: '26px', textAlign: 'right', flexShrink: 0 }}>{t}</span>
                </div>
              );
            })}
            {categories.length === 0 && (
              <span style={{ color: 'var(--text-3)', fontSize: '13px' }}>No data yet — add APIs and let the worker run…</span>
            )}
          </div>

          <Link href="/apis" style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '16px', fontSize: '12px', color: 'var(--blue)', textDecoration: 'none', fontWeight: 500 }}>
            Browse all APIs <ArrowRight size={12} />
          </Link>
        </div>
      </div>

      {/* ── Recent Activity ── */}
      <div className="g-card" style={{ overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 22px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
          <Activity size={15} color="var(--text-2)" strokeWidth={1.9} />
          <span style={{ fontSize: '14px', fontWeight: '700' }}>Recent Activity</span>
          <span style={{ marginLeft: 'auto', fontSize: '11.5px', color: 'var(--text-3)' }}>
            {data?.timestamp ? `Updated ${timeAgo(data.timestamp)}` : 'Waiting…'}
          </span>
        </div>

        {activity.length === 0 ? (
          <div style={{ padding: '44px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13.5px' }}>
            <Plus size={28} style={{ margin: '0 auto 12px', display: 'block', opacity: 0.25 }} />
            No activity yet —{' '}
            <Link href="/apis" style={{ color: 'var(--blue)', textDecoration: 'none' }}>add your first API</Link>
            {' '}to start monitoring.
          </div>
        ) : activity.map((a, i) => (
          <Link key={a.id} href={`/apis/${a.api_id}`} style={{ textDecoration: 'none', color: 'inherit', display: 'block' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: '13px',
              padding: '10px 22px', borderBottom: i < activity.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
              transition: 'background .14s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.025)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
              {a.success
                ? <CheckCircle2 size={14} color="#22d47e" strokeWidth={2.2} style={{ flexShrink: 0 }} />
                : <XCircle size={14} color="#f05e6a" strokeWidth={2.2} style={{ flexShrink: 0 }} />}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '13px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-1)' }}>{a.api_name}</div>
                <div style={{ fontSize: '11.5px', color: 'var(--text-3)', marginTop: '1px' }}>
                  {a.category}{a.latency_ms != null ? ` · ${a.latency_ms}ms` : ''}
                  {a.error_message ? ` · ${a.error_message}` : ''}
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                {a.status_code != null && (
                  <span style={{ fontSize: '12px', fontFamily: 'ui-monospace, monospace', color: a.status_code < 400 ? '#22d47e' : '#f05e6a', fontWeight: 600 }}>{a.status_code}</span>
                )}
                <span style={{ fontSize: '11.5px', color: 'var(--text-3)', minWidth: '48px', textAlign: 'right' }}>{timeAgo(a.checked_at)}</span>
                <ArrowRight size={13} color="var(--text-3)" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
