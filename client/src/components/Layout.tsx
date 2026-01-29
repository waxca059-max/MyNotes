import React, { useState } from 'react';
import { Menu, X, StickyNote, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface LayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  onOpenCommand?: () => void;
}

export const Layout: React.FC<LayoutProps> = ({ sidebar, children, onOpenCommand }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex h-screen w-full bg-white dark:bg-[#0F172A] text-slate-900 dark:text-slate-100 overflow-hidden relative selection:bg-blue-500/30">
      {/* 动态背景光晕 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-blue-500/10 blur-[120px] animate-pulse" />
        <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-purple-500/10 blur-[120px] animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* 移动端顶部导航栏 - 毛玻璃样式 */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 border-b border-white/10 bg-white/60 dark:bg-[#0F172A]/60 backdrop-blur-xl flex items-center justify-between px-4 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-1.5 rounded-lg shadow-lg shadow-blue-500/20">
            <StickyNote className="text-white" size={16} />
          </div>
          <span className="font-bold text-sm tracking-tight text-slate-900 dark:text-white">我的笔记</span>
        </div>
        <div className="flex items-center gap-1">
          <button 
            onClick={onOpenCommand} 
            className="p-2 text-slate-500 hover:text-blue-500 transition-colors cursor-pointer"
          >
            <Search size={18} />
          </button>
          <button 
            onClick={toggleSidebar} 
            className="p-2 text-slate-900 dark:text-white cursor-pointer"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      {/* 遮罩层 */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] md:hidden" 
            onClick={() => setIsSidebarOpen(false)} 
          />
        )}
      </AnimatePresence>

      <aside className={`
        fixed inset-y-0 left-0 z-[70] w-72 md:w-80 h-full border-r border-white/5 bg-white/80 dark:bg-slate-950/40 backdrop-blur-2xl transition-transform duration-500 ease-out
        md:relative md:translate-x-0
        ${isSidebarOpen ? 'translate-x-0 shadow-2xl shadow-black/20' : '-translate-x-full'}
      `}>
        <div 
          className="h-full flex flex-col overflow-hidden relative" 
          onClick={(e) => e.stopPropagation()}
        >
          {sidebar}
        </div>
      </aside>

      <main className="flex-1 flex flex-col bg-slate-50/30 dark:bg-slate-900/10 relative pt-14 md:pt-0 overflow-x-hidden backdrop-blur-[2px]">
        <div className="flex-1 flex flex-col relative z-10 h-full">
          {children}
        </div>
      </main>
    </div>
  );
};
