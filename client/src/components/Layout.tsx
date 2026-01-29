import React from 'react';

interface LayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ sidebar, children }) => {
  return (
    <div className="flex h-screen w-full bg-slate-50/50 dark:bg-slate-950 text-slate-950 dark:text-slate-50 overflow-hidden font-sans">
      <aside className="w-80 border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-sm flex flex-col z-10 transition-colors">
        {sidebar}
      </aside>
      <main className="flex-1 flex flex-col bg-white dark:bg-slate-900 relative transition-colors">
        {children}
      </main>
    </div>
  );
};
