const BASE_URL = '/api';

export interface Note {
  id: string;
  title: string;
  content: string;
  category: string;
  tags?: string[];
  pinned?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  username: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Token 管理
const TOKEN_KEY = 'notes_app_token';
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

// 通用 Fetch 封装 (带 Token)
const authFetch = async (url: string, options: RequestInit = {}) => {
  const token = getToken();
  const headers = {
    ...options.headers,
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };

  const res = await fetch(url, { ...options, headers });
  
  if (res.status === 401 || res.status === 403) {
    clearToken();
    window.location.reload(); // 触发页面重新渲染以引导登录
    throw new Error('鉴权失效');
  }

  return res;
};

export const notesApi = {
  async getAll(q?: string): Promise<Note[]> {
    const url = q ? `${BASE_URL}/notes?q=${encodeURIComponent(q)}` : `${BASE_URL}/notes`;
    const res = await authFetch(url);
    if (!res.ok) throw new Error('Failed to fetch notes');
    return res.json();
  },

  async save(note: Partial<Note>): Promise<{ success: boolean; data: Note }> {
    const res = await authFetch(`${BASE_URL}/notes`, {
      method: 'POST',
      body: JSON.stringify(note),
    });
    if (!res.ok) throw new Error('Failed to save note');
    return res.json();
  },

  async delete(id: string): Promise<{ success: boolean }> {
    const res = await authFetch(`${BASE_URL}/notes/${id}`, {
      method: 'DELETE',
    });
    if (!res.ok) throw new Error('Failed to delete note');
    return res.json();
  },

  async uploadImage(file: File): Promise<{ url: string }> {
    const formData = new FormData();
    formData.append('image', file);
    
    const token = getToken();
    const res = await fetch(`${BASE_URL}/upload`, {
      method: 'POST',
      headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
      body: formData,
    });
    
    if (!res.ok) throw new Error('Upload failed');
    return res.json();
  },

  // 用户认证 API
  auth: {
    async login(username: string, password: string): Promise<{ token: string; user: User }> {
      const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '登录失败');
      return data;
    },
    async register(username: string, password: string): Promise<{ success: boolean }> {
      const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '注册失败');
      return data;
    }
  },

  // AI 相关 API
  ai: {
    async summarize(content: string): Promise<string> {
      const res = await authFetch(`${BASE_URL}/ai/summarize`, {
        method: 'POST',
        body: JSON.stringify({ content })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '生成摘要失败');
      return data.summary;
    },
    async suggestTags(content: string): Promise<string[]> {
      const res = await authFetch(`${BASE_URL}/ai/tags`, {
        method: 'POST',
        body: JSON.stringify({ content })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '提取标签失败');
      return data.tags;
    },
    async chat(content: string, question: string, history: ChatMessage[] = []): Promise<string> {
      const res = await authFetch(`${BASE_URL}/ai/chat`, {
        method: 'POST',
        body: JSON.stringify({ content, question, history })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '对话失败');
      return data.answer;
    },
    async format(content: string): Promise<string> {
      const res = await authFetch(`${BASE_URL}/ai/format`, {
        method: 'POST',
        body: JSON.stringify({ content })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '排版失败');
      return data.formatted;
    }
  }
};
