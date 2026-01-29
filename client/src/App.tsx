import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Layout } from '@/components/Layout';
import { Sidebar } from '@/components/Sidebar';
import { MarkdownEditor } from '@/components/MarkdownEditor';
import { notesApi, type Note, clearToken, getToken } from '@/api/notes';
import { Auth } from '@/components/Auth';
import { CommandMenu } from '@/components/CommandMenu';
import { toast } from 'sonner';
import { Loader2, StickyNote } from 'lucide-react';
import { Toaster } from '@/components/ui/sonner';

export default function App() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(!!getToken());
  const [isCommandOpen, setIsCommandOpen] = useState(false);
  
  // 搜索防抖逻辑
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // 用于优化自动保存：记录最后一次成功保存或加载的内容
  const lastSavedContentRef = useRef<string | null>(null);

  // 1. 获取数据逻辑
  const fetchNotes = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await notesApi.getAll(debouncedSearchTerm);
      setNotes(data || []);
    } catch (error: unknown) {
      const err = error as Error;
      if (err.message === '鉴权失效') {
        setIsAuthenticated(false);
      } else {
        toast.error('获取笔记失败');
      }
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, debouncedSearchTerm]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchNotes();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, fetchNotes]);

  // 2. 交互逻辑
  const activeNote = useMemo(() => 
    notes.find(n => n.id === activeNoteId), 
    [notes, activeNoteId]
  );

  // 当切换笔记时，记录当前笔记内容作为“基准”，避免跨笔记比对错误
  useEffect(() => {
    if (activeNote) {
      lastSavedContentRef.current = activeNote.content;
    } else {
      lastSavedContentRef.current = null;
    }
  }, [activeNoteId, activeNote]); // 监听 ID 变化及内容初始化

  const filteredNotesByTag = useMemo(() => {
    let result = notes;
    if (selectedTag) {
      result = result.filter(n => n.tags?.includes(selectedTag));
    }
    return result;
  }, [notes, selectedTag]);

  const handleAddNote = useCallback(async () => {
    try {
      const newNote = {
        title: '',
        content: '',
        category: '默认',
        tags: [],
        pinned: false
      };
      const res = await notesApi.save(newNote);
      if (res.success) {
        setNotes(prev => [res.data, ...prev]);
        setActiveNoteId(res.data.id);
        lastSavedContentRef.current = ''; // 新笔记内容为空
        toast.success("已创建新笔记");
      }
    } catch (error: unknown) {
      console.error('Add note failed:', error);
      toast.error("创建失败");
    }
  }, []);

  const handleUpdateLocalNote = useCallback((updates: Partial<Note>) => {
    if (!activeNoteId) return;
    setNotes(prev => prev.map(n => n.id === activeNoteId ? { ...n, ...updates } : n));
  }, [activeNoteId]);

  const handleSaveNote = useCallback(async (updates: Partial<Note>, silent = false) => {
    if (!activeNoteId) return;
    try {
      const currentNote = notes.find(n => n.id === activeNoteId);
      if (!currentNote) return;
      
      const updatedNote = { ...currentNote, ...updates };
      const res = await notesApi.save(updatedNote);
      if (res.success) {
        setNotes(prev => prev.map(n => n.id === activeNoteId ? res.data : n));
        // 更新“最后保存”引用
        lastSavedContentRef.current = res.data.content;
        if (!silent) toast.success("已保存");
      }
    } catch (error: unknown) {
      console.error('Save failed:', error);
      if (!silent) toast.error("保存失败");
    }
  }, [notes, activeNoteId]);

  const handleDeleteNote = useCallback(async (id: string) => {
    if (!confirm('确定删除此笔记吗？')) return;
    try {
      const res = await notesApi.delete(id);
      if (res.success) {
        setNotes(prev => prev.filter(n => n.id !== id));
        if (activeNoteId === id) setActiveNoteId(null);
        toast.success("已删除");
      }
    } catch (error: unknown) {
      console.error('Delete failed:', error);
      toast.error("删除失败");
    }
  }, [activeNoteId]);

  const handleLogout = () => {
    clearToken();
    setIsAuthenticated(false);
    setNotes([]);
    setActiveNoteId(null);
    toast.success('已安全退出');
  };

  // 4. 优化后的自动保存逻辑 (1.5s 防抖 + 内容变更检测)
  useEffect(() => {
    if (loading || !activeNote || !activeNote.id) return;
    
    // 核心优化：如果内容没有变化，不启动自动保存
    if (activeNote.content === lastSavedContentRef.current) return;

    const timer = setTimeout(() => {
      handleSaveNote(activeNote, true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [activeNote, loading, handleSaveNote]);

  // 5. 统一的快捷键支持
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const isMod = e.ctrlKey || e.metaKey;
    const key = e.key.toLowerCase();

    if (isMod && key === 'k') {
      e.preventDefault();
      setIsCommandOpen(prev => !prev);
    } else if (isMod && key === 's') {
      e.preventDefault();
      if (activeNote) handleSaveNote(activeNote, false);
    }
  }, [activeNote, handleSaveNote]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  if (!isAuthenticated) {
    return (
      <>
        <Auth onAuthSuccess={() => setIsAuthenticated(true)} />
        <Toaster position="top-center" richColors />
      </>
    );
  }

  if (loading && notes.length === 0) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 gap-4">
        <div className="bg-slate-900 dark:bg-slate-800 p-3 rounded-2xl shadow-xl animate-bounce">
          <StickyNote className="text-white" size={32} />
        </div>
        <div className="flex items-center gap-2 text-slate-500 font-bold tracking-widest text-sm uppercase">
          <Loader2 className="animate-spin" size={18} />
          同步云端数据...
        </div>
      </div>
    );
  }

  return (
    <Layout
      sidebar={
        <Sidebar 
          notes={filteredNotesByTag}
          activeNoteId={activeNoteId}
          onSelectNote={setActiveNoteId}
          onAddNote={handleAddNote}
          onDeleteNote={handleDeleteNote}
          onSearchChange={setSearchTerm}
          searchTerm={searchTerm}
          selectedTag={selectedTag}
          onSelectTag={setSelectedTag}
          onLogout={handleLogout}
        />
      }
    >
      <main className="flex-1 overflow-hidden relative">
        {activeNote ? (
          <MarkdownEditor 
            key={activeNote.id}
            note={activeNote} 
            onChange={handleUpdateLocalNote}
            onSave={() => handleSaveNote({}, false)}
          />
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-slate-300 dark:text-slate-800 bg-slate-50/20 dark:bg-slate-950/20 p-8 text-center">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[40px] shadow-2xl shadow-indigo-500/5 mb-8 border border-slate-100 dark:border-slate-800/50">
              <StickyNote size={64} className="opacity-20 mb-4 mx-auto" strokeWidth={1} />
              <h2 className="text-2xl font-black text-slate-400 dark:text-slate-600 mb-2 tracking-tighter uppercase">My Notes</h2>
              <p className="text-sm font-medium text-slate-400 dark:text-slate-700 max-w-[240px]">选择一篇笔记开始创作，或点击左侧按钮新建你的灵感。</p>
            </div>
            <div className="flex gap-2 text-slate-900 dark:text-slate-100 items-center justify-center">
              请通过 <kbd className="mx-2 px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-sans border border-slate-200 dark:border-slate-700 shadow-sm text-xs font-bold">Ctrl + K</kbd> 开启快速命令
            </div>
          </div>
        )}
      </main>

      {/* 全局命令中心 */}
      <CommandMenu 
        notes={notes}
        isOpen={isCommandOpen}
        setIsOpen={setIsCommandOpen}
        onSelectNote={setActiveNoteId}
        onNewNote={handleAddNote}
        onLogout={handleLogout}
      />

      <Toaster position="top-center" richColors />
    </Layout>
  );
}
