import React from 'react';
import { Search, Plus, Trash2, FileText, StickyNote, Moon, Sun, Pin, LogOut } from 'lucide-react';
import type { Note } from '@/api/notes';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useTheme } from 'next-themes';
import { motion, AnimatePresence } from 'framer-motion';

// Shadcn UI Components
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface SidebarProps {
  notes: Note[];
  activeNoteId: string | null;
  onSelectNote: (id: string) => void;
  onAddNote: () => void;
  onDeleteNote: (id: string) => void;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedTag: string | null;
  onSelectTag: (tag: string | null) => void;
  onLogout: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  notes,
  activeNoteId,
  onSelectNote,
  onAddNote,
  onDeleteNote,
  searchTerm,
  onSearchChange,
  selectedTag,
  onSelectTag,
  onLogout
}) => {
  const { theme, setTheme } = useTheme();

  // 计算所有唯一标签
  const allTags = React.useMemo(() => {
    const tags = new Set<string>();
    notes.forEach(note => {
      note.tags?.forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [notes]);

  // 排序逻辑：置顶优先，其次按更新时间降序
  const sortedNotes = React.useMemo(() => {
    return [...notes].sort((a, b) => {
      if (a.pinned && !b.pinned) return -1;
      if (!a.pinned && b.pinned) return 1;
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    });
  }, [notes]);

  return (
    <div className="flex flex-col h-full bg-slate-50/30 dark:bg-slate-950/30 transition-colors">
      <div className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-slate-900 dark:bg-slate-800 p-1.5 rounded-lg shadow-inner">
              <StickyNote className="text-white" size={18} />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-100">
              我的笔记
            </h1>
          </div>
          <Button
            variant="default"
            size="sm"
            onClick={onAddNote}
            className="rounded-lg px-3 flex gap-1.5 shadow-sm active:scale-95 transition-all bg-slate-900 dark:bg-slate-100 dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-200 text-white"
          >
            <Plus size={16} strokeWidth={3} />
            <span className="font-bold">新建</span>
          </Button>
        </div>
        
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-slate-900 dark:group-focus-within:text-slate-100 transition-colors" size={15} />
          <Input
            placeholder="搜索笔记..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-9 h-9 bg-white dark:bg-slate-900 border-slate-200/60 dark:border-slate-800 shadow-none rounded-lg focus-visible:ring-1 focus-visible:ring-slate-400 dark:focus-visible:ring-slate-700 transition-all placeholder:text-slate-400 text-sm"
          />
        </div>

        {/* 标签云过滤 */}
        {allTags.length > 0 && (
          <div className="space-y-2">
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider px-1">
              标签筛选
            </span>
            <ScrollArea className="h-32 -mx-1 px-1 pr-4 border border-transparent" type="always">
              <div className="flex flex-wrap gap-1.5 py-1 pr-2">
                <Badge
                  variant={selectedTag === null ? "default" : "secondary"}
                  onClick={() => onSelectTag(null)}
                  className={`cursor-pointer text-[10px] px-2 py-0 h-5 transition-all ${
                    selectedTag === null ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900' : 'bg-slate-200/50 dark:bg-slate-800/50 text-slate-500'
                  }`}
                >
                  全部
                </Badge>
                {allTags.map(tag => (
                  <Badge
                    key={tag}
                    variant={selectedTag === tag ? "default" : "secondary"}
                    onClick={() => onSelectTag(selectedTag === tag ? null : tag)}
                    className={`cursor-pointer text-[10px] px-2 py-0 h-5 transition-all ${
                      selectedTag === tag 
                        ? 'bg-indigo-600 dark:bg-indigo-400 text-white dark:text-slate-900 shadow-sm' 
                        : 'bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-500 dark:text-indigo-400 border-none'
                    }`}
                  >
                    #{tag}
                  </Badge>
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      <Separator className="bg-slate-200/60 dark:bg-slate-800/60" />

      <ScrollArea className="flex-1 min-h-0 px-3 py-4">
        {sortedNotes.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-20 text-slate-400 text-center space-y-3"
          >
            <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-full opacity-60">
              <FileText size={32} />
            </div>
            <p className="text-sm font-medium">未找到笔记</p>
          </motion.div>
        ) : (
          <div className="space-y-1.5">
            <AnimatePresence mode="popLayout">
              {sortedNotes.map(note => (
                <motion.div
                  layout
                  key={note.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => onSelectNote(note.id)}
                  className={`group p-3 rounded-lg cursor-pointer transition-all border ${
                    activeNoteId === note.id 
                      ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm' 
                      : note.pinned
                        ? 'bg-amber-50/30 dark:bg-amber-950/10 border-amber-100/50 dark:border-amber-900/30 text-slate-600'
                        : 'bg-transparent border-transparent hover:bg-slate-200/40 dark:hover:bg-slate-800/40 text-slate-600 dark:text-slate-400'
                  }`}
                >
                  <div className="flex justify-between items-start gap-2 mb-1">
                    <div className="flex items-center gap-1.5 min-w-0 flex-1">
                      {note.pinned && <Pin size={12} className="text-amber-500 shrink-0" fill="currentColor" />}
                      <h3 className={`font-semibold text-sm truncate ${
                        activeNoteId === note.id ? 'text-slate-900 dark:text-slate-100' : 'text-slate-700 dark:text-slate-300'
                      }`}>
                        {note.title || '无标题'}
                      </h3>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteNote(note.id);
                      }}
                      className="opacity-0 group-hover:opacity-100 h-6 w-6 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950 transition-opacity"
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                  
                  <p className="text-[12px] text-slate-500 dark:text-slate-400 line-clamp-1 mb-2 leading-relaxed">
                    {note.content || '开始编写...'}
                  </p>
                  
                  <div className="flex justify-between items-center mt-auto">
                    <div className="flex gap-1 overflow-hidden">
                      <Badge variant="secondary" className="px-1.5 py-0 h-4 text-[10px] font-medium bg-slate-200/50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-none shrink-0">
                        {note.category}
                      </Badge>
                      {note.tags?.slice(0, 2).map(tag => (
                        <Badge key={tag} className="px-1.5 py-0 h-4 text-[9px] font-normal bg-indigo-50/50 dark:bg-indigo-900/20 text-indigo-500 dark:text-indigo-400 border-none whitespace-nowrap">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium shrink-0">
                      {formatDistanceToNow(new Date(note.updatedAt), { addSuffix: true, locale: zhCN })}
                    </span>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </ScrollArea>

      <div className="p-4 border-t border-slate-200/60 dark:border-slate-800 space-y-3 bg-white/50 dark:bg-slate-950/50 transition-colors shrink-0">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              setTheme(theme === 'dark' ? 'light' : 'dark');
            }}
            className="h-8 w-8 text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
          >
            <Sun size={16} className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon size={16} className="absolute rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">切换主题</span>
          </Button>
 
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onLogout();
            }}
            title="退出登录"
            className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all"
          >
            <LogOut size={16} />
          </Button>
        </div>
        
        <div className="flex items-center justify-between px-1">
          <span className="text-[10px] font-medium text-slate-400 dark:text-slate-600 uppercase tracking-widest">
            Version 1.3.0
          </span>
        </div>
      </div>
    </div>
  );
};
