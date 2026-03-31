import React, { useState, useEffect } from 'react';
import BannerTitle from '@/components/BannerTitle';
import { PageIntro } from '@/components/ui/page-intro';
import { SurfaceCard } from '@/components/ui/surface-card';

const Dashboard = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="text-slate-800">
      <BannerTitle title="Dashboard" />

      <section className="mb-6 overflow-hidden rounded-[32px] border border-white/60 bg-[linear-gradient(135deg,#0f172a_0%,#1d4ed8_55%,#22d3ee_140%)] p-8 text-white shadow-[0_28px_80px_rgba(15,23,42,0.2)]">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-200/90">
              Executive Overview
            </p>
            <h2 className="text-3xl font-semibold tracking-tight md:text-4xl">
              Fast Investment Limited
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-50/88">
              A focused command center for projects, portfolio movements, reporting, and operational follow-through.
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 text-sm text-blue-50 backdrop-blur-sm">
            <p className="font-semibold text-white">Today</p>
            <p>
              {currentTime.toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <SurfaceCard tone="subtle">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-100 text-blue-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <h3 className="mb-2 text-xl font-semibold text-slate-900">Market Overview</h3>
          <p className="text-sm leading-6 text-slate-600">Track performance snapshots and keep the most important operational numbers visible.</p>
        </SurfaceCard>

        <SurfaceCard tone="strong">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 text-cyan-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
          </div>
          <h3 className="mb-2 text-xl font-semibold">Portfolio Tracking</h3>
          <p className="text-sm leading-6 text-slate-200/90">Review investments, trades, and project movements with a stronger operations-first presentation.</p>
        </SurfaceCard>

        <SurfaceCard tone="subtle">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h3 className="mb-2 text-xl font-semibold text-slate-900">Risk Management</h3>
          <p className="text-sm leading-6 text-slate-600">Keep receivables, payouts, and control points visible in a calmer, more professional interface.</p>
        </SurfaceCard>
      </div>
    </div>
  );
};

export default Dashboard;
