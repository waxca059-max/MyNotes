import React from 'react';
import ReactMarkdown from 'react-markdown';
import type { Note } from '@/api/notes';
import { notesApi } from '@/api/notes';
import {
  ImageIcon, Eye, Edit3, Save, Download, X, Sparkles, Wand2, Loader2, Pin, Hash, Columns, MessageSquare, LayoutTemplate,
  Bold, Italic, Link2, List, ListOrdered, Quote, Heading1, Heading2, Heading3, MinusSquare, Code, CheckSquare
} from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Shadcn UI Components
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { AIChatPanel } from './AIChatPanel';

interface MarkdownEditorProps {
  note: Note;
  onChange: (updates: Partial<Note>) => void;
  onSave: () => void;
}

const FormatButton: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  shortcut?: string; 
  onClick: () => void;
}> = ({ icon, label, shortcut, onClick }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <Button 
        variant="ghost" 
        size="icon" 
        className="h-7 w-7 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 transition-colors" 
        onClick={onClick}
      >
        {icon}
      </Button>
    </TooltipTrigger>
    <TooltipContent side="bottom" className="flex flex-col items-center gap-1 p-2">
      <span className="text-[11px] font-bold">{label}</span>
      {shortcut && <span className="text-[9px] opacity-60 font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">{shortcut}</span>}
    </TooltipContent>
  </Tooltip>
);

export const MarkdownEditor: React.FC<MarkdownEditorProps> = ({ note, onChange, onSave }) => {
  const [view, setView] = React.useState<'edit' | 'preview' | 'both'>('both');
  const [tagInput, setTagInput] = React.useState('');
  const [uploading, setUploading] = React.useState(false);
  const [aiLoading, setAiLoading] = React.useState(false);
  const [showAIChat, setShowAIChat] = React.useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);

  // 移动端默认单栏视图 (修复“挤在一起”的问题)
  React.useEffect(() => {
    if (window.innerWidth < 768 && view === 'both') {
      setView('edit');
    }
  }, [view]);

  const handleAiSummarize = async () => {
    if (!note.content) return toast.error('请先输入内容');
    setAiLoading(true);
    try {
      const summary = await notesApi.ai.summarize(note.content);
      const newContent = `> [!NOTE]\n> **AI 摘要**: ${summary}\n\n${note.content}`;
      onChange({ content: newContent });
      toast.success('摘要已生成并插入');
    } catch (error: unknown) {
      toast.error((error as Error).message || 'AI 生成失败');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiSuggestTags = async () => {
    if (!note.content) return toast.error('请先输入内容');
    setAiLoading(true);
    try {
      const suggestedTags = await notesApi.ai.suggestTags(note.content);
      const currentTags = note.tags || [];
      const combinedTags = Array.from(new Set([...currentTags, ...suggestedTags]));
      onChange({ tags: combinedTags });
      toast.success(`推荐了 ${suggestedTags.length} 个新标签`);
    } catch (error: unknown) {
      toast.error((error as Error).message || 'AI 推荐失败');
    } finally {
      setAiLoading(false);
    }
  };

  const handleAiFormat = async () => {
    if (!note.content.trim()) return;
    setAiLoading(true);
    const originalContent = note.content;
    try {
      const formatted = await notesApi.ai.format(note.content);
      onChange({ content: formatted });
      
      toast.success('排版完成', {
        description: '已优化结构与缩进',
        action: {
          label: '撤销',
          onClick: () => {
            onChange({ content: originalContent });
            toast('已恢复原始内容');
          }
        }
      });
    } catch (error: unknown) {
      toast.error((error as Error).message || '排版失败');
    } finally {
      setAiLoading(false);
    }
  };

  const components = {
    code({ inline, className, children, ...props }: React.HTMLAttributes<HTMLElement> & { inline?: boolean }) {
      const match = /language-(\w+)/.exec(className || '');
      return !inline && match ? (
        <SyntaxHighlighter
          style={vscDarkPlus as any}
          language={match[1]}
          PreTag="div"
          className="rounded-md my-4"
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className="bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded text-indigo-600 dark:text-indigo-400 font-mono text-[0.9em]" {...props}>
          {children}
        </code>
      );
    }
  };

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      const currentTags = note.tags || [];
      const newTag = tagInput.trim();
      if (!currentTags.includes(newTag)) {
        onChange({ tags: [...currentTags, newTag] });
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange({ tags: (note.tags || []).filter(t => t !== tagToRemove) });
  };

  const applyFormat = (type: 'bold' | 'italic' | 'link' | 'quote' | 'code' | 'h1' | 'h2' | 'h3' | 'ul' | 'ol' | 'todo' | 'hr') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = note.content.substring(start, end);
    let replacement = '';
    let selectionOffset = 0;
    let selectionLength = 0;

    switch (type) {
      case 'bold':
        replacement = `**${selectedText || '加粗文字'}**`;
        selectionOffset = 2;
        selectionLength = selectedText ? selectedText.length : 4;
        break;
      case 'italic':
        replacement = `*${selectedText || '斜体文字'}*`;
        selectionOffset = 1;
        selectionLength = selectedText ? selectedText.length : 4;
        break;
      case 'link':
        replacement = `[${selectedText || '链接描述'}](url)`;
        selectionOffset = selectedText ? selectedText.length + 3 : 1;
        selectionLength = selectedText ? 3 : 4;
        break;
      case 'quote':
        replacement = `\n> ${selectedText || '引用文字'}\n`;
        selectionOffset = 3;
        selectionLength = selectedText ? selectedText.length : 4;
        break;
      case 'code':
        replacement = selectedText.includes('\n') 
          ? `\n\`\`\`javascript\n${selectedText || '// 代码'}\n\`\`\`\n`
          : `\`${selectedText || '行内代码'}\``;
        selectionOffset = selectedText.includes('\n') ? 15 : 1;
        selectionLength = selectedText ? selectedText.length : (selectedText.includes('\n') ? 4 : 4);
        break;
      case 'h1':
        replacement = `\n# ${selectedText || '一级标题'}\n`;
        selectionOffset = 3;
        selectionLength = selectedText ? selectedText.length : 4;
        break;
      case 'h2':
        replacement = `\n## ${selectedText || '二级标题'}\n`;
        selectionOffset = 4;
        selectionLength = selectedText ? selectedText.length : 4;
        break;
      case 'h3':
        replacement = `\n### ${selectedText || '三级标题'}\n`;
        selectionOffset = 5;
        selectionLength = selectedText ? selectedText.length : 4;
        break;
      case 'ul':
        replacement = `\n- ${selectedText || '列表项目'}\n`;
        selectionOffset = 3;
        selectionLength = selectedText ? selectedText.length : 4;
        break;
      case 'ol':
        replacement = `\n1. ${selectedText || '列表项目'}\n`;
        selectionOffset = 4;
        selectionLength = selectedText ? selectedText.length : 4;
        break;
      case 'todo':
        replacement = `\n- [ ] ${selectedText || '待办事项'}\n`;
        selectionOffset = 7;
        selectionLength = selectedText ? selectedText.length : 4;
        break;
      case 'hr':
        replacement = `\n---\n`;
        selectionOffset = 5;
        selectionLength = 0;
        break;
    }

    const newContent = note.content.substring(0, start) + replacement + note.content.substring(end);
    onChange({ content: newContent });

    setTimeout(() => {
      textarea.focus();
      if (selectedText) {
        textarea.setSelectionRange(start + replacement.length, start + replacement.length);
      } else {
        textarea.setSelectionRange(start + selectionOffset, start + selectionOffset + selectionLength);
      }
    }, 0);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key.toLowerCase()) {
        case 'b':
          e.preventDefault();
          applyFormat('bold');
          break;
        case 'i':
          e.preventDefault();
          applyFormat('italic');
          break;
        case 'k':
          e.preventDefault();
          applyFormat('link');
          break;
        case 's':
          e.preventDefault();
          onSave();
          break;
      }
    }
  };

  const insertTextAtCursor = (text: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentContent = note.content;
    const newContent = currentContent.substring(0, start) + text + currentContent.substring(end);
    
    onChange({ content: newContent });
    
    // 异步更新光标位置
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + text.length, start + text.length);
    }, 0);
  };

  const handleImageUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('只支持上传图片文件');
      return;
    }

    setUploading(true);
    try {
      const { url } = await notesApi.uploadImage(file);
      insertTextAtCursor(`\n![Image](${url})\n`);
      toast.success('图片上传成功');
    } catch (error: unknown) {
      toast.error((error as Error).message || '操作失败');
    } finally {
      setUploading(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const items = e.clipboardData.items;
    for (const item of items) {
      if (item.type.indexOf('image') !== -1) {
        const file = item.getAsFile();
        if (file) handleImageUpload(file);
      }
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleImageUpload(files[0]);
    }
  };

  const handleExport = () => {
    const blob = new Blob([note.content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${note.title || 'untitled'}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('导出成功');
  };

  const wordCount = note.content.trim().length;
  const readingTime = Math.ceil(wordCount / 400) || 1;

  return (
    <div className="flex flex-col h-full bg-white dark:bg-slate-950 transition-colors">
      <header className="h-16 px-6 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between shrink-0 bg-white/50 dark:bg-slate-950/50 backdrop-blur-sm z-10">
        <div className="flex-1 min-w-0 max-w-2xl flex items-center space-x-2 md:space-x-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onChange({ pinned: !note.pinned })}
            className={`h-8 w-8 transition-colors ${note.pinned ? 'text-amber-500 bg-amber-50 dark:bg-amber-950/30' : 'text-slate-300 dark:text-slate-700'}`}
          >
            {note.pinned ? <Pin size={16} fill="currentColor" /> : <Pin size={16} />}
          </Button>
          <input
            type="text"
            placeholder="笔记标题"
            value={note.title}
            onChange={(e) => onChange({ title: e.target.value })}
            className="text-xl font-bold bg-transparent border-none outline-none w-full text-slate-900 dark:text-slate-100 placeholder:text-slate-200 dark:placeholder:text-slate-800"
          />
          <Badge variant="outline" className="hidden sm:flex text-[10px] h-5 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider shrink-0">
            {note.category}
          </Badge>
        </div>
        <div className="flex items-center gap-2 md:gap-4 shrink-0">
          {/* 视图切换 */}
          <div className="flex bg-slate-100/80 dark:bg-slate-900 p-1 rounded-lg">
            <Button
              variant={view === 'edit' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setView('edit')}
              className={`h-8 w-8 rounded-md transition-all ${view === 'edit' ? 'bg-white dark:bg-slate-800 shadow-sm' : 'text-slate-500'}`}
            >
              <Edit3 size={15} />
            </Button>
            <Button
              variant={view === 'both' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setView('both')}
              className={`h-8 w-8 rounded-md transition-all ${view === 'both' ? 'bg-white dark:bg-slate-800 shadow-sm' : 'text-slate-500'}`}
            >
              <Columns size={15} />
            </Button>
            <Button
              variant={view === 'preview' ? 'secondary' : 'ghost'}
              size="icon"
              onClick={() => setView('preview')}
              className={`h-8 w-8 rounded-md transition-all ${view === 'preview' ? 'bg-white dark:bg-slate-800 shadow-sm' : 'text-slate-500'}`}
            >
              <Eye size={15} />
            </Button>
          </div>
          
          <Separator orientation="vertical" className="h-6 bg-slate-200 dark:bg-slate-800" />

          {/* AI 智能工具 */}
          <div className="flex items-center gap-1.5 px-1.5 py-1 bg-indigo-50/50 dark:bg-indigo-900/20 rounded-xl border border-indigo-100/50 dark:border-indigo-800/30">
            <Button
              variant="ghost"
              size="sm"
              disabled={aiLoading}
              onClick={handleAiSummarize}
              className="h-8 px-2.5 text-indigo-600 dark:text-indigo-400 hover:bg-white dark:hover:bg-indigo-900/40 hover:shadow-sm rounded-lg flex gap-1.5 transition-all group"
            >
              {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} className="group-hover:animate-pulse" />}
              <span className="hidden lg:inline text-[11px] font-bold">AI 摘要</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={aiLoading}
              onClick={handleAiSuggestTags}
              className="h-8 px-2.5 text-indigo-600 dark:text-indigo-400 hover:bg-white dark:hover:bg-indigo-900/40 hover:shadow-sm rounded-lg flex gap-1.5 transition-all group"
            >
              {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} className="group-hover:rotate-12 transition-transform" />}
              <span className="hidden lg:inline text-[11px] font-bold">AI 标签</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={aiLoading}
              onClick={handleAiFormat}
              className="h-8 px-2.5 text-indigo-600 dark:text-indigo-400 hover:bg-white dark:hover:bg-indigo-900/40 hover:shadow-sm rounded-lg flex gap-1.5 transition-all group"
            >
              {aiLoading ? <Loader2 size={14} className="animate-spin" /> : <LayoutTemplate size={14} className="group-hover:scale-110 transition-transform" />}
              <span className="hidden lg:inline text-[11px] font-bold">一键排版</span>
            </Button>
          </div>
          
          <Separator orientation="vertical" className="h-6 bg-slate-200 dark:bg-slate-800" />
          
          <div className="flex items-center gap-2">
            <Button
              variant={showAIChat ? "secondary" : "ghost"}
              size="sm"
              onClick={() => setShowAIChat(!showAIChat)}
              className={`h-9 px-3 gap-2 rounded-lg border border-transparent transition-all ${showAIChat ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 border-indigo-200' : 'text-slate-600'}`}
            >
              <MessageSquare size={16} />
              <span className="hidden sm:inline text-xs font-bold">AI 助手</span>
            </Button>

            <Separator orientation="vertical" className="h-6 bg-slate-200 dark:bg-slate-800" />
            <Button
              variant="outline"
              onClick={handleExport}
              title="导出为 Markdown"
              className="h-9 px-2 md:px-3 rounded-lg border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 flex items-center"
            >
              <Download size={16} />
              <span className="hidden sm:inline text-xs font-bold ml-1.5">导出</span>
            </Button>
            
            <Button
              onClick={onSave}
              variant="default"
              className="gap-2 px-3 md:px-5 py-2 h-9 rounded-lg shadow-sm active:scale-95 transition-all bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 hover:bg-slate-800 dark:hover:bg-slate-200"
            >
              <Save size={16} />
              <span className="hidden xs:inline font-bold">保存</span>
            </Button>
          </div>
        </div>
      </header>

      {/* 增强格式工具栏 */}
      <div className="px-6 py-1.5 bg-slate-50/30 dark:bg-slate-900/10 border-b border-slate-100 dark:border-slate-800/40 flex items-center gap-1 overflow-x-auto no-scrollbar">
        <TooltipProvider>
          <div className="flex items-center gap-0.5 pr-2 border-r border-slate-200 dark:border-slate-800">
            <FormatButton icon={<Bold size={14} />} label="加粗" shortcut="Ctrl+B" onClick={() => applyFormat('bold')} />
            <FormatButton icon={<Italic size={14} />} label="斜体" shortcut="Ctrl+I" onClick={() => applyFormat('italic')} />
            <FormatButton icon={<Heading1 size={14} />} label="一级标题" onClick={() => applyFormat('h1')} />
            <FormatButton icon={<Heading2 size={14} />} label="二级标题" onClick={() => applyFormat('h2')} />
            <FormatButton icon={<Heading3 size={14} />} label="三级标题" onClick={() => applyFormat('h3')} />
          </div>
          
          <div className="flex items-center gap-0.5 px-2 border-r border-slate-200 dark:border-slate-800">
            <FormatButton icon={<List size={14} />} label="无序列表" onClick={() => applyFormat('ul')} />
            <FormatButton icon={<ListOrdered size={14} />} label="有序列表" onClick={() => applyFormat('ol')} />
            <FormatButton icon={<CheckSquare size={14} />} label="待办事项" onClick={() => applyFormat('todo')} />
          </div>

          <div className="flex items-center gap-0.5 px-2 border-r border-slate-200 dark:border-slate-800">
            <FormatButton icon={<Quote size={14} />} label="引用" onClick={() => applyFormat('quote')} />
            <FormatButton icon={<Code size={14} />} label="代码块" onClick={() => applyFormat('code')} />
            <FormatButton icon={<Link2 size={14} />} label="链接" shortcut="Ctrl+K" onClick={() => applyFormat('link')} />
            <FormatButton icon={<MinusSquare size={14} />} label="分割线" onClick={() => applyFormat('hr')} />
          </div>

          <div className="flex items-center gap-0.5 pl-2">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-500" onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/*';
                  input.onchange = (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) handleImageUpload(file);
                  };
                  input.click();
                }}>
                  <ImageIcon size={14} />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-[10px]">插入图片</TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>
      </div>

      {/* 标签与上传状态栏 */}
      <div className="px-6 py-2 bg-slate-50/50 dark:bg-slate-900/30 border-b border-slate-100 dark:border-slate-800/60 flex items-center justify-between min-h-[40px]">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <Hash size={14} className="text-slate-400 shrink-0" />
          <div className="flex flex-wrap gap-1.5 items-center">
            <AnimatePresence>
              {note.tags?.map(tag => (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  key={tag}
                >
                  <Badge 
                    variant="secondary" 
                    className="pl-2 pr-1 h-5 text-[10px] bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 border-none flex items-center group"
                  >
                    {tag}
                    <button 
                      onClick={() => removeTag(tag)}
                      className="ml-1 p-0.5 rounded-full hover:bg-indigo-100 dark:hover:bg-indigo-800 transition-colors"
                    >
                      <X size={10} />
                    </button>
                  </Badge>
                </motion.div>
              ))}
            </AnimatePresence>
            <input
              type="text"
              placeholder="添加标签..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              className="bg-transparent border-none outline-none text-[10px] text-slate-500 dark:text-slate-400 placeholder:text-slate-300 dark:placeholder:text-slate-700 w-24 focus:w-40 transition-all font-medium"
            />
          </div>
        </div>
        
        {uploading && (
          <div className="flex items-center gap-2 text-[10px] text-indigo-500 font-bold animate-pulse">
            <Loader2 size={12} className="animate-spin" />
            正在上传图片...
          </div>
        )}
      </div>
      <div className="flex-1 flex overflow-hidden relative">
        {(view === 'edit' || view === 'both') && (
          <div className="flex-1 flex flex-col relative group/editor">
            <div className="absolute top-3 left-6 z-10 opacity-0 group-hover/editor:opacity-100 transition-opacity">
              <Badge variant="outline" className="text-[9px] h-5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 text-slate-400 font-bold uppercase tracking-tighter">
                Editor / 源码编辑
              </Badge>
            </div>
            <textarea
              ref={textareaRef}
              value={note.content}
              onChange={(e) => onChange({ content: e.target.value })}
              onPaste={handlePaste}
              onKeyDown={handleKeyDown}
              onDrop={handleDrop}
              placeholder="开始编写 Markdown 笔记 (支持粘贴/拖入图片)..."
              className={`flex-1 p-10 outline-none resize-none text-slate-700 dark:text-slate-300 leading-relaxed font-mono text-[14px] bg-white dark:bg-slate-950 shadow-sm placeholder:text-slate-300 dark:placeholder:text-slate-700 selection:bg-indigo-50 dark:selection:bg-indigo-900/50 ${view === 'both' ? 'border-r-2 border-slate-100/50 dark:border-slate-800/30' : ''}`}
            />
          </div>
        )}
        {(view === 'preview' || view === 'both') && (
          <div className="flex-1 flex flex-col relative group/preview">
            <div className="absolute top-3 left-6 z-10 opacity-0 group-hover/preview:opacity-100 transition-opacity">
              <Badge variant="outline" className="text-[9px] h-5 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 text-indigo-400 font-bold uppercase tracking-tighter shadow-sm">
                Preview / 效果预览
              </Badge>
            </div>
            <ScrollArea className="flex-1 bg-slate-50 dark:bg-slate-900/20 shadow-inner">
              <div className="p-10 prose prose-slate dark:prose-invert max-w-none prose-h1:text-2xl prose-h2:text-xl prose-p:text-slate-600 dark:prose-p:text-slate-400 prose-code:text-indigo-600 dark:prose-code:text-indigo-400 prose-pre:bg-transparent prose-pre:p-0">
                <ReactMarkdown components={components}>{note.content || '*暂无内容*'}</ReactMarkdown>
              </div>
            </ScrollArea>
          </div>
        )}
        
        <AnimatePresence>
          {showAIChat && (
            <div className="fixed md:absolute inset-0 md:inset-auto md:right-0 md:top-0 md:bottom-0 z-50 md:z-40">
              <AIChatPanel 
                noteContent={note.content} 
                onClose={() => setShowAIChat(false)}
                onInsertContent={insertTextAtCursor}
              />
            </div>
          )}
        </AnimatePresence>
      </div>

      <footer className="h-8 px-6 flex items-center justify-between border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/30 text-[10px] text-slate-400 dark:text-slate-500 font-medium shrink-0 transition-colors">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <ImageIcon size={12} className="opacity-60" />
            <span>支持富媒体</span>
          </div>
          <Separator orientation="vertical" className="h-3 bg-slate-200 dark:bg-slate-800" />
          <span>{wordCount} 字</span>
          <Separator orientation="vertical" className="h-3 bg-slate-200 dark:bg-slate-800" />
          <span>预计阅读 {readingTime} 分钟</span>
        </div>
        <div className="flex items-center gap-2 uppercase tracking-widest opacity-60">
          Advanced Editor Mode
        </div>
      </footer>
    </div>
  );
};
