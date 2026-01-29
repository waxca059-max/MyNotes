import React, { useState } from 'react';
import { notesApi, setToken } from '@/api/notes';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, StickyNote, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface AuthProps {
  onAuthSuccess: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return toast.error('请填写完整信息');

    setLoading(true);
    try {
      if (isLogin) {
        const { token } = await notesApi.auth.login(username, password);
        setToken(token);
        toast.success('登录成功');
        onAuthSuccess();
      } else {
        await notesApi.auth.register(username, password);
        toast.success('注册成功，请登录');
        setIsLogin(true);
      }
    } catch (error: unknown) {
      toast.error((error as Error).message || '操作失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors">
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20 dark:opacity-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-500 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-[400px] z-10"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="bg-slate-900 dark:bg-slate-800 p-3 rounded-2xl shadow-xl mb-4">
            <StickyNote className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-black tracking-tighter text-slate-900 dark:text-slate-100">
            MY NOTES
          </h1>
          <p className="text-sm text-slate-500 font-medium">随时随地，沉浸创作</p>
        </div>

        <Card className="border-slate-200/60 dark:border-slate-800/60 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden">
          <CardHeader className="space-y-1 pt-8">
            <CardTitle className="text-2xl font-bold text-center">
              {isLogin ? '欢迎回来' : '开启旅程'}
            </CardTitle>
            <CardDescription className="text-center font-medium">
              {isLogin ? '输入您的账号以管理笔记' : '创建一个新账号以开始记录'}
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="username" className="text-[12px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">用户名</Label>
                <Input
                  id="username"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border-none h-11 rounded-xl focus-visible:ring-1 focus-visible:ring-slate-300 transition-all font-medium"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" dir="ltr" className="text-[12px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 text-right w-full block">密码</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-50 dark:bg-slate-950 border-none h-11 rounded-xl focus-visible:ring-1 focus-visible:ring-slate-300 transition-all font-medium"
                />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-4 pb-8">
              <Button 
                type="submit" 
                disabled={loading}
                className="w-full h-12 rounded-xl bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-950 font-bold text-lg hover:scale-[1.02] active:scale-95 transition-all shadow-lg"
              >
                {loading ? <Loader2 className="animate-spin" size={20} /> : (
                  <>
                    {isLogin ? '登录' : '注册'}
                    <ArrowRight className="ml-2" size={18} />
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="link"
                className="text-slate-500 dark:text-slate-400 font-medium"
                onClick={() => setIsLogin(!isLogin)}
              >
                {isLogin ? '没有账号？立即注册' : '已有账号？返回登录'}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </motion.div>
    </div>
  );
};
