'use client';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Globe, Github, ExternalLink } from 'lucide-react';

const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/apis', label: 'APIs', icon: Globe },
];

// ← Replace with your project GitHub URL
const PROJECT_GITHUB = 'https://github.com/etherian3/check-api-app';
const SOURCE_GITHUB = 'https://github.com/public-api-lists/public-api-lists';

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside style={{
            width: '215px', minWidth: '215px',
            height: '100vh', position: 'sticky', top: 0,
            background: 'rgba(6,10,20,0.9)',
            backdropFilter: 'blur(24px)',
            WebkitBackdropFilter: 'blur(24px)',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', flexDirection: 'column',
        }}>
            {/* Logo */}
            <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '11px' }}>
                    <div style={{ width: '36px', height: '36px', flexShrink: 0, overflow: 'hidden', borderRadius: '8px' }}>
                        <Image src="/capi.png" alt="Capi Logo" width={36} height={36} style={{ objectFit: 'cover' }} />
                    </div>
                    <div>
                        <div style={{ fontSize: '15px', fontWeight: '700', letterSpacing: '-0.015em', color: 'var(--text-1)' }}>C.api</div>
                        <div style={{ fontSize: '10px', color: 'var(--text-3)', letterSpacing: '0.04em', marginTop: '1px' }}>API Monitor</div>
                    </div>
                </div>
            </div>

            {/* Nav */}
            <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto' }}>
                <div className="sec-label" style={{ padding: '8px 10px 5px' }}>Navigation</div>

                {navItems.map((item) => {
                    const active = pathname === item.href || (item.href !== '/' && pathname?.startsWith(item.href));
                    const Icon = item.icon;
                    return (
                        <Link key={item.href} href={item.href} style={{
                            display: 'flex', alignItems: 'center', gap: '9px',
                            padding: '8px 10px', borderRadius: '9px', fontSize: '13.5px', fontWeight: '500',
                            color: active ? 'var(--blue)' : 'var(--text-2)',
                            background: active ? 'rgba(74,158,255,0.1)' : 'transparent',
                            textDecoration: 'none', marginBottom: '2px',
                            border: active ? '1px solid rgba(74,158,255,0.15)' : '1px solid transparent',
                            transition: 'all .15s',
                        }}>
                            <Icon size={15} strokeWidth={active ? 2.3 : 1.8} />
                            {item.label}
                        </Link>
                    );
                })}

                <hr className="divider" style={{ margin: '12px 4px' }} />
                <div className="sec-label" style={{ padding: '4px 10px 5px' }}>Resources</div>

                {[
                    { href: SOURCE_GITHUB, label: 'API Source List' },
                    { href: PROJECT_GITHUB, label: 'This Project' },
                ].map(({ href, label }) => (
                    <a key={href} href={href} target="_blank" rel="noreferrer" style={{
                        display: 'flex', alignItems: 'center', gap: '9px', padding: '8px 10px',
                        borderRadius: '9px', fontSize: '12.5px', color: 'var(--text-3)',
                        textDecoration: 'none', marginBottom: '1px', transition: 'color .15s',
                    }}
                        onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-2)')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)')}>
                        <Github size={13} strokeWidth={1.8} />
                        {label}
                        <ExternalLink size={10} style={{ marginLeft: 'auto', opacity: .5 }} />
                    </a>
                ))}
            </nav>

            {/* Footer */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="dot-green" />
                    <span style={{ fontSize: '11.5px', color: 'var(--text-3)' }}>System Online</span>
                </div>
            </div>
        </aside>
    );
}
