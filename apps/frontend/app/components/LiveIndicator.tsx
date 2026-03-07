'use client';
import { SSEStatus } from '../../lib/useSSE';

export default function LiveIndicator({ status }: { status: SSEStatus }) {
    const dot = status === 'connected' ? 'dot-green' : status === 'disconnected' ? 'dot-red' : 'dot-amber';
    const label = status === 'connected' ? 'Live' : status === 'disconnected' ? 'Disconnected' : 'Connecting…';
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
            <div className={dot} />
            <span style={{ fontSize: '12px', color: 'var(--text-3)', fontWeight: 500 }}>{label}</span>
        </div>
    );
}
