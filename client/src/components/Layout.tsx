import React, { useState } from 'react';
import { Menu, X, StickyNote, Search } from 'lucide-react';

interface LayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  onOpenCommand?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ sidebar, children, onOpenCommand }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex h-screen w-full bg-slate-50/50 dark:bg-slate-950 text-slate-950 dark:text-slate-50 overflow-hidden font-sans relative">
      {/* 移动端顶部导航栏 */}
      <header className="md:hidden absolute top-0 left-0 right-0 h-14 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md flex items-center justify-between px-4 z-20">
        <div className="flex items-center gap-2">
          <div className="bg-slate-900 dark:bg-slate-800 p-1.5 rounded-lg">
            <StickyNote className="text-white" size={16} />
          </div>
          <span className="font-bold text-sm">我的笔记</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onOpenCommand} className="p-2 text-slate-500"><Search size={18} /></button>
          <button onClick={toggleSidebar} className="p-2">
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* 遮罩层 */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30 md:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 md:w-80 h-full border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-xl md:shadow-none transition-transform duration-300
        md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div 
          className="h-full flex flex-col overflow-hidden relative" 
          onClick={(e) => e.stopPropagation()}
        >
          {sidebar}
        </div>
      </aside>

      <main className="flex-1 flex flex-col bg-white dark:bg-slate-900 relative pt-14 md:pt-0 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
};
