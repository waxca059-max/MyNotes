import React, { useState, useRef, useEffect } from 'react';
import { Send, X, Bot, User, Loader2, Sparkles, Copy, MessageSquarePlus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { notesApi } from '@/api/notes';
import { toast } from 'sonner';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatPanelProps {
  noteContent: string;
  onClose: () => void;
  onInsertContent: (content: string) => void;
}

export const AIChatPanel: React.FC<AIChatPanelProps> = ({ noteContent, onClose, onInsertContent }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // 自动滚动到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userQuestion = input.trim();
    setInput('');
    const newMessages: Message[] = [...messages, { role: 'user', content: userQuestion }];
    setMessages(newMessages);

    setLoading(true);
    try {
      const answer = await notesApi.ai.chat(noteContent, userQuestion, messages);
      setMessages([...newMessages, { role: 'assistant', content: answer }]);
    } catch (error: unknown) {
      toast.error((error as Error).message || '对话出错');
    } finally {
      setLoading(false);
    }
  };

  const handleInsert = (text: string) => {
    onInsertContent(`\n\n${text}`);
    toast.success('已插入到笔记');
  };

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="w-full md:w-[500px] h-full border-l border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 md:bg-slate-50/80 md:dark:bg-slate-900/50 backdrop-blur-2xl flex flex-col shadow-2xl relative z-40"
    >
      <header className="h-16 px-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-500 rounded-lg">
            <Bot size={18} className="text-white" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">AI 笔记助手</h3>
            <p className="text-[10px] text-slate-400 font-medium">懂你的内容，更有深度</p>
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-slate-400 hover:text-slate-600">
          <X size={16} />
        </Button>
      </header>

      <div className="flex-1 overflow-hidden relative">
        <ScrollArea className="h-full px-5 py-6">
          <div ref={scrollRef} className="space-y-6">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
                <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-2xl shadow-sm flex items-center justify-center">
                  <Sparkles className="text-indigo-500" size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-600 dark:text-slate-300">还没有对话</p>
                  <p className="text-[10px] text-slate-400 mt-1 max-w-[180px]">你可以针对当前笔记内容提问，也可以让 AI 帮你润色或续写。</p>
                </div>
                <div className="grid grid-cols-1 gap-2 w-full mt-4">
                  {['总结这篇笔记的核心点', '帮我精简一下目前的内容', '给我一些相关的创意灵感'].map(suggestion => (
                    <button
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="text-xs text-left p-3.5 bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 border border-slate-100 dark:border-slate-800 rounded-lg text-slate-500 dark:text-slate-400 transition-colors shadow-sm"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <AnimatePresence initial={false}>
              {messages.map((ms, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex flex-col ${ms.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div className={`flex items-start gap-2.5 max-w-full ${ms.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${ms.role === 'user' ? 'bg-slate-200 dark:bg-slate-700' : 'bg-indigo-500 shadow-lg shadow-indigo-500/20'}`}>
                      {ms.role === 'user' ? <User size={14} className="text-slate-600 dark:text-slate-300" /> : <Bot size={14} className="text-white" />}
                    </div>
                    <div className={`px-5 py-4 rounded-2xl text-[15px] leading-relaxed shadow-sm ${ms.role === 'user' ? 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tr-none border border-slate-100 dark:border-slate-800' : 'bg-indigo-500 text-white rounded-tl-none font-medium'}`}>
                      {ms.content}
                    </div>
                  </div>
                  
                  {ms.role === 'assistant' && (
                    <div className="flex items-center gap-2 mt-2 ml-10">
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => handleInsert(ms.content)}
                        className="h-6 px-2 text-[9px] text-slate-400 hover:text-indigo-500 gap-1 bg-white/50 dark:bg-white/5 rounded-full"
                      >
                        <MessageSquarePlus size={10} />
                        插入笔记
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => {
                          navigator.clipboard.writeText(ms.content);
                          toast.success('已复制到剪贴板');
                        }}
                        className="h-6 px-2 text-[9px] text-slate-400 hover:text-indigo-500 gap-1 bg-white/50 dark:bg-white/5 rounded-full"
                      >
                        <Copy size={10} />
                        复制
                      </Button>
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
            
            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-2.5">
                <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center animate-pulse">
                  <Bot size={14} className="text-white" />
                </div>
                <div className="flex gap-1.5 p-3 px-4 bg-slate-200/50 dark:bg-slate-800 rounded-2xl rounded-tl-none">
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                  <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-slate-400 rounded-full" />
                </div>
              </motion.div>
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="p-5 pt-0 shrink-0">
        <div className="relative group bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-sm transition-all focus-within:border-indigo-500/50 focus-within:ring-4 ring-indigo-500/5 focus-within:shadow-md overflow-hidden">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="问问 AI..."
            className="w-full min-h-[44px] max-h-40 p-4 pb-14 bg-transparent outline-none text-[14px] text-slate-700 dark:text-slate-200 placeholder:text-slate-300 dark:placeholder:text-slate-600 resize-none transition-all"
          />
          <div className="absolute right-3 bottom-3 flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-[10px] text-slate-400 font-bold opacity-0 group-focus-within:opacity-100 transition-opacity">
               <span className="px-1.5 py-0.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900">Enter</span>
               <span>发送</span>
            </div>
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || loading}
              className={`h-9 w-9 rounded-xl transition-all ${input.trim() ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20 scale-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 scale-95'}`}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={16} />}
            </Button>
          </div>
        </div>
        <p className="mt-2.5 text-center text-[10px] text-slate-400 font-medium opacity-50">
          AI 可能会产生错误信息，请核查重要内容
        </p>
      </div>
    </motion.div>
  );
};
