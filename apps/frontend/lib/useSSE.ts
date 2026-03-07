'use client';
import { useState, useEffect, useRef } from 'react';
import { OverviewStats, RecentActivity, CategoryStat } from './api';

const SSE_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api') + '/stream';

export interface SSEPayload {
    overview: OverviewStats;
    activity: RecentActivity[];
    categories: CategoryStat[];
    timestamp: string;
}

export type SSEStatus = 'connecting' | 'connected' | 'disconnected';

export function useSSE() {
    const [data, setData] = useState<SSEPayload | null>(null);
    const [status, setStatus] = useState<SSEStatus>('connecting');
    const esRef = useRef<EventSource | null>(null);
    const retryRef = useRef<NodeJS.Timeout | null>(null);

    function connect() {
        if (esRef.current) esRef.current.close();

        const es = new EventSource(SSE_URL);
        esRef.current = es;
        setStatus('connecting');

        es.onopen = () => setStatus('connected');

        es.onmessage = (e) => {
            try {
                const payload: SSEPayload = JSON.parse(e.data);
                setData(payload);
                setStatus('connected');
            } catch { /* ignore parse errors */ }
        };

        es.onerror = () => {
            setStatus('disconnected');
            es.close();
            esRef.current = null;
            // Retry after 5 seconds
            retryRef.current = setTimeout(connect, 5000);
        };
    }

    useEffect(() => {
        connect();
        return () => {
            esRef.current?.close();
            if (retryRef.current) clearTimeout(retryRef.current);
        };
    }, []);

    return { data, status };
}
