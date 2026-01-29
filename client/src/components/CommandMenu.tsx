import React, { useState } from 'react';
import { Command } from 'cmdk';
import { 
  Search, FilePlus, LogOut, Sparkles, Wand2, 
  FileText, ArrowRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Note } from '@/api/notes';
import { DialogTitle, DialogDescription } from "@/components/ui/dialog";

interface CommandMenuProps {
  notes: Note[];
  onSelectNote: (id: string) => void;
  onNewNote: () => void;
  onLogout: () => void;
  onSummarize?: () => void;
  onSuggestTags?: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const CommandMenu: React.FC<CommandMenuProps> = ({
  notes, onSelectNote, onNewNote, onLogout, onSummarize, onSuggestTags, isOpen, setIsOpen
}) => {
  const [search, setSearch] = useState('');

  // 快捷键逻辑现由全局 App.tsx 统一管理

  return (
    <AnimatePresence>
      {isOpen && (
        <Command.Dialog
          open={isOpen}
          onOpenChange={setIsOpen}
          label="Global Command Menu"
          className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] overflow-hidden"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="w-full max-w-[640px] bg-white/80 dark:bg-slate-900/80 backdrop-blur-2xl rounded-3xl shadow-2xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden"
          >
            <div className="sr-only">
              <DialogTitle>全局命令菜单</DialogTitle>
              <DialogDescription>搜索笔记、执行 AI 操作或管理账户</DialogDescription>
            </div>

            <div className="flex items-center border-b border-slate-100 dark:border-slate-800/60 px-6 py-4">
              <Search className="mr-4 h-5 w-5 text-slate-400 shrink-0" />
              <Command.Input
                placeholder="搜索笔记或快捷命令..."
                value={search}
                onValueChange={setSearch}
                className="flex-1 bg-transparent border-none outline-none text-lg text-slate-900 dark:text-slate-100 placeholder:text-slate-400 font-medium"
              />
              <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-500 uppercase">
                ESC
              </kbd>
            </div>

            <Command.List className="max-h-[min(480px,70vh)] overflow-y-auto p-3 scrollbar-none">
              <Command.Empty className="py-12 text-center text-slate-400">
                <FileText className="mx-auto h-12 w-12 opacity-10 mb-4" />
                <p className="text-sm font-medium">未找到匹配结果</p>
              </Command.Empty>

              <Command.Group heading="常用操作" className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                <Item onSelect={() => { onNewNote(); setIsOpen(false); }}>
                  <FilePlus className="mr-3 h-4 w-4" />
                  <span>新建笔记</span>
                </Item>
                {onSummarize && (
                  <Item onSelect={() => { onSummarize(); setIsOpen(false); }}>
                    <Sparkles className="mr-3 h-4 w-4 text-indigo-500" />
                    <span className="text-indigo-600 dark:text-indigo-400">AI 一键摘要</span>
                  </Item>
                )}
                {onSuggestTags && (
                  <Item onSelect={() => { onSuggestTags(); setIsOpen(false); }}>
                    <Wand2 className="mr-3 h-4 w-4 text-indigo-500" />
                    <span className="text-indigo-600 dark:text-indigo-400">AI 推荐标签</span>
                  </Item>
                )}
              </Command.Group>

              <Command.Group heading="最近笔记" className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-4">
                {notes.slice(0, 10).map((note) => (
                  <Item key={note.id} onSelect={() => { onSelectNote(note.id); setIsOpen(false); }}>
                    <div className="flex flex-col">
                      <span className="text-[14px] font-bold text-slate-700 dark:text-slate-200">{note.title || '无标题笔记'}</span>
                      <span className="text-[11px] text-slate-400 truncate max-w-[400px]">{note.content.substring(0, 80)}</span>
                    </div>
                    <ArrowRight className="ml-auto h-4 w-4 opacity-10" />
                  </Item>
                ))}
              </Command.Group>

              <Command.Separator className="h-px bg-slate-100 dark:bg-slate-800 my-4" />

              <Command.Group heading="账户" className="px-3 py-2 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                <Item onSelect={() => { onLogout(); setIsOpen(false); }} className="text-red-500 hover:text-red-600">
                  <LogOut className="mr-3 h-4 w-4" />
                  <span>退出登录</span>
                </Item>
              </Command.Group>
            </Command.List>

            <div className="px-6 py-4 bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-100 dark:border-slate-800/40 flex items-center justify-between">
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5 grayscale opacity-50">
                  <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-bold">↑↓</kbd>
                  <span className="text-[11px] font-medium">选择</span>
                </div>
                <div className="flex items-center gap-1.5 grayscale opacity-50">
                  <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10px] font-bold">Enter</kbd>
                  <span className="text-[11px] font-medium">确认</span>
                </div>
              </div>
              <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">
                My Notes Commander
              </div>
            </div>
          </motion.div>
        </Command.Dialog>
      )}
    </AnimatePresence>
  );
};

const Item = ({ children, onSelect, className }: { children: React.ReactNode; onSelect: () => void; className?: string }) => (
  <Command.Item
    onSelect={onSelect}
    className={`flex items-center px-4 py-3 rounded-2xl cursor-default select-none transition-all
    aria-selected:bg-slate-100 dark:aria-selected:bg-slate-800 aria-selected:scale-[1.01] active:scale-[0.99]
    ${className}`}
  >
    {children}
  </Command.Item>
);
