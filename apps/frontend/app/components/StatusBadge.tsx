'use client';
import { CheckCircle2, XCircle, HelpCircle } from 'lucide-react';

interface Props { status: 'UP' | 'DOWN' | 'UNKNOWN'; size?: 'sm' | 'md'; }

export default function StatusBadge({ status, size = 'md' }: Props) {
    const map = {
        UP: { cls: 'badge-up', Icon: CheckCircle2, color: '#22d47e' },
        DOWN: { cls: 'badge-down', Icon: XCircle, color: '#f05e6a' },
        UNKNOWN: { cls: 'badge-unknown', Icon: HelpCircle, color: '#8fa3c0' },
    }[status];

    return (
        <span className={map.cls} style={{ fontSize: size === 'sm' ? '10px' : '11px', padding: size === 'sm' ? '2px 7px' : '3px 10px' }}>
            <map.Icon size={size === 'sm' ? 10 : 11} strokeWidth={2.2} color={map.color} />
            {status}
        </span>
    );
}
