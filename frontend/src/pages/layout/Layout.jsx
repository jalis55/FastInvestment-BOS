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
    const isDesktopDevice = useMediaQuery("(min-width: 768px)");
    const [collapsed, setCollapsed] = useState(!isDesktopDevice);

    const sidebarRef = useRef(null);

    useEffect(() => {
        setCollapsed(!isDesktopDevice);
    }, [isDesktopDevice]);

    useEffect(() => {
        if (isDesktopDevice || collapsed) return;
        const dismiss = (event) => { if (event.key === 'Escape') setCollapsed(true); };
        window.addEventListener('keydown', dismiss);
        return () => window.removeEventListener('keydown', dismiss);
    }, [isDesktopDevice, collapsed]);

    const closeMobileNavigation = () => { if (!isDesktopDevice) setCollapsed(true); };

    return (
        <div className="min-h-screen bg-transparent">
            {!isDesktopDevice && !collapsed && <button type="button" aria-label="Close navigation overlay" onClick={() => setCollapsed(true)} className="fixed inset-0 z-[90] bg-slate-950/50 backdrop-blur-sm" />}
            <div className="pointer-events-none fixed inset-0 -z-20 bg-[radial-gradient(circle_at_top_left,rgba(59,130,246,0.14),transparent_24%),radial-gradient(circle_at_top_right,rgba(6,182,212,0.12),transparent_22%),linear-gradient(180deg,#f8fbff_0%,#eef3f9_100%)]" />
            <Sidebar
                ref={sidebarRef}
                collapsed={collapsed}
                isMobile={!isDesktopDevice}
                onClose={() => setCollapsed(true)}
                onNavigate={closeMobileNavigation}
            />
            <div className={cn("transition-[margin] duration-300", collapsed ? "md:ml-[76px]" : "md:ml-[264px]")}>
                <Header
                    collapsed={collapsed}
                    setCollapsed={setCollapsed}
                />
                <div className="h-[calc(100vh-72px)] overflow-y-auto overflow-x-hidden p-6 md:p-8">
                    <ErrorBoundary key={location.pathname}>
                      <Suspense fallback={<Spinner />}><Outlet /></Suspense>
                    </ErrorBoundary>
                </div>
            </div>
        </div>
    );
};

export default Layout;
