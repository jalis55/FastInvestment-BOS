import { Suspense } from 'react';
import ErrorBoundary from '@/components/errors/ErrorBoundary';
import Spinner from '@/components/Spinner';
import { Outlet, useLocation } from "react-router-dom";
import { useMediaQuery } from "@uidotdev/usehooks";
import Header from "@/components/Header";
import Sidebar from "@/components/Sidebar";
import {cn} from "@/utils/cn";
import { useEffect, useRef, useState } from "react";

const Layout = () => {
    const location = useLocation();
    const isDesktopDevice = useMediaQuery("(min-width: 1024px)");
    const [collapsed, setCollapsed] = useState(!isDesktopDevice);

    const sidebarRef = useRef(null);
    const menuButtonRef = useRef(null);
    const mobileNavOpen = !isDesktopDevice && !collapsed;

    useEffect(() => {
        setCollapsed(!isDesktopDevice);
    }, [isDesktopDevice]);

    useEffect(() => {
        if (!mobileNavOpen) return;
        sidebarRef.current?.querySelector('[aria-label="Close navigation"]')?.focus();
        const handleKeyDown = (event) => {
            if (event.key === 'Escape') setCollapsed(true);
            if (event.key !== 'Tab') return;
            const controls = [...(sidebarRef.current?.querySelectorAll('a[href], button') ?? [])]
                .filter((element) => element.getClientRects().length);
            const first = controls[0];
            const last = controls.at(-1);
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            requestAnimationFrame(() => menuButtonRef.current?.focus());
        };
    }, [mobileNavOpen]);

    const closeMobileNavigation = () => { if (!isDesktopDevice) setCollapsed(true); };

    return (
        <div className="min-h-screen bg-transparent">
            {mobileNavOpen && <button type="button" tabIndex={-1} aria-label="Close navigation overlay" onClick={() => setCollapsed(true)} className="fixed inset-0 z-[90] bg-slate-950/50 backdrop-blur-sm" />}
            <div className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_24%),radial-gradient(circle_at_top_right,rgba(6,182,212,0.12),transparent_22%),linear-gradient(180deg,#f8fbff_0%,#eef3f9_100%)]" />
            <Sidebar
                ref={sidebarRef}
                collapsed={collapsed}
                isMobile={!isDesktopDevice}
                onClose={() => setCollapsed(true)}
                onNavigate={closeMobileNavigation}
            />
            <div inert={mobileNavOpen || undefined} className={cn("transition-[margin] duration-300 motion-reduce:transition-none", collapsed ? "lg:ml-[76px]" : "lg:ml-[264px]")}>
                <Header
                    collapsed={collapsed}
                    setCollapsed={setCollapsed}
                    isMobile={!isDesktopDevice}
                    menuButtonRef={menuButtonRef}
                />
                <div className="h-[calc(100dvh-64px)] overflow-y-auto overflow-x-hidden overscroll-y-contain px-4 py-4 sm:px-6 sm:py-6 lg:h-[calc(100dvh-72px)] lg:p-8">
                    <main className="mx-auto w-full min-w-0 max-w-7xl">
                        <ErrorBoundary key={location.pathname}>
                            <Suspense fallback={<Spinner />}><Outlet /></Suspense>
                        </ErrorBoundary>
                    </main>
                </div>
            </div>
        </div>
    );
};

export default Layout;
