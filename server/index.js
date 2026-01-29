import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import { existsSync, mkdirSync, appendFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';
import multer from 'multer';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import db from './db.js';
import { aiService } from './ai.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOGS_DIR = path.join(__dirname, 'logs');
const ERROR_LOG = path.join(LOGS_DIR, 'error.log');

// 确保日志目录存在
if (!existsSync(LOGS_DIR)) {
  mkdirSync(LOGS_DIR, { recursive: true });
}

// 错误日志助手 (使用同步 IO 确保崩溃时也能写入)
const writeErrorLog = (err, req = null) => {
  const timestamp = new Date().toISOString();
  const entry = {
    timestamp,
    message: err.message,
    stack: err.stack,
    url: req ? req.originalUrl : 'N/A',
    method: req ? req.method : 'N/A',
    body: req ? req.body : {}
  };
  const logEntry = `[${timestamp}] ERROR: ${JSON.stringify(entry, null, 2)}\n${'-'.repeat(80)}\n`;
  try {
    appendFileSync(ERROR_LOG, logEntry);
  } catch (logErr) {
    console.error('[Logger] Failed to write error log:', logErr.message);
  }
};

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';
const UPLOADS_PATH = path.join(__dirname, '..', 'data', 'uploads');
const CLIENT_DIST_PATH = path.join(__dirname, '..', 'client', 'dist');

// 确认文件夹存在
if (!existsSync(UPLOADS_PATH)) {
  mkdirSync(UPLOADS_PATH, { recursive: true });
}

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(UPLOADS_PATH));
// 托管前端静态文件
app.use(express.static(CLIENT_DIST_PATH));

// --- 中间件 ---

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: '请先登录' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: '登录失效，请重新登录' });
    req.user = user;
    next();
  });
};

// --- Multer 配置 ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_PATH),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// --- 认证接口 ---

app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: '用户名和密码不能为空' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();

    const stmt = db.prepare('INSERT INTO users (id, username, password) VALUES (?, ?, ?)');
    stmt.run(userId, username, hashedPassword);

    res.json({ success: true, message: '注册成功' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: '用户名已存在' });
    }
    res.status(500).json({ error: '注册失败' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ success: true, token, user: { id: user.id, username: user.username } });
  } catch (error) {
    res.status(500).json({ error: '登录失败' });
  }
});

// --- 笔记接口 (需要认证) ---

app.get('/api/notes', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { q } = req.query;
    
    let notes;
    if (q) {
      // 全文检索模式 (加固特殊字符处理，防止 FTS5 语法报错)
      // 处理逻辑：将内部的双引号转义为两个双引号，然后用双引号包裹整体并开启前缀匹配
      const escapedQ = q.replace(/"/g, '""');
      const safeQuery = `"${escapedQ}"*`;
      
      notes = db.prepare(`
        SELECT n.* 
        FROM notes n
        JOIN notes_fts f ON n.id = f.id
        WHERE f.user_id = ? AND f.notes_fts MATCH ?
        ORDER BY n.pinned DESC, f.rank
      `).all(userId, safeQuery);
    } else {
      // 默认列表模式
      notes = db.prepare('SELECT * FROM notes WHERE user_id = ? ORDER BY pinned DESC, updated_at DESC').all(userId);
    }
    
    // 转换数据格式 (映射字段名)
    const formattedNotes = notes.map(n => ({
      id: n.id,
      title: n.title,
      content: n.content,
      category: n.category,
      pinned: !!n.pinned,
      tags: JSON.parse(n.tags || '[]'),
      createdAt: n.created_at,
      updatedAt: n.updated_at
    }));
    
    res.json(formattedNotes);
  } catch (error) {
    console.error('Fetch notes error:', error);
    res.status(500).json({ error: '读取笔记失败' });
  }
});

app.post('/api/notes', authenticateToken, (req, res) => {
  try {
    const { id, title, content, category, tags, pinned } = req.body;
    const userId = req.user.id;
    const now = new Date().toISOString();

    let finalNoteId;

    if (id) {
      // 更新 (确保笔记属于该用户)
      const existing = db.prepare('SELECT id FROM notes WHERE id = ? AND user_id = ?').get(id, userId);
      if (!existing) return res.status(404).json({ error: '未找到笔记或无权修改' });

      db.prepare(`
        UPDATE notes 
        SET title = ?, content = ?, category = ?, tags = ?, pinned = ?, updated_at = ? 
        WHERE id = ? AND user_id = ?
      `).run(title, content, category, JSON.stringify(tags || []), pinned ? 1 : 0, now, id, userId);
      finalNoteId = id;
    } else {
      // 创建
      const newId = uuidv4();
      db.prepare(`
        INSERT INTO notes (id, user_id, title, content, category, tags, pinned, created_at, updated_at) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(newId, userId, title || '', content || '', category || '默认', JSON.stringify(tags || []), pinned ? 1 : 0, now, now);
      finalNoteId = newId;
    }

    // 这里重新获取并转换
    const n = db.prepare('SELECT * FROM notes WHERE id = ?').get(finalNoteId);

    res.json({ 
      success: true, 
      data: {
        id: n.id,
        title: n.title,
        content: n.content,
        category: n.category,
        pinned: !!n.pinned,
        tags: JSON.parse(n.tags || '[]'),
        createdAt: n.created_at,
        updatedAt: n.updated_at
      } 
    });
  } catch (error) {
    console.error('Save error:', error);
    res.status(500).json({ error: '保存笔记失败' });
  }
});

app.delete('/api/notes/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const result = db.prepare('DELETE FROM notes WHERE id = ? AND user_id = ?').run(id, userId);
    
    if (result.changes === 0) return res.status(404).json({ error: '未找到笔记或无权删除' });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: '删除笔记失败' });
  }
});

app.post('/api/upload', authenticateToken, upload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请上传文件' });
  const url = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
  res.json({ url });
});

// --- AI 接口 ---

app.post('/api/ai/summarize', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    const summary = await aiService.summarize(content);
    res.json({ summary });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/tags', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    const tags = await aiService.suggestTags(content);
    res.json({ tags });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/chat', authenticateToken, async (req, res) => {
  try {
    const { content, question, history } = req.body;
    const answer = await aiService.chat(content, question, history);
    res.json({ answer });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/format', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    const formatted = await aiService.format(content);
    res.json({ formatted });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- 数据迁移逻辑 (从 JSON 到 SQLite) ---
async function migrateData() {
  const JSON_PATH = path.join(__dirname, '..', 'data', 'notes.json');
  if (existsSync(JSON_PATH)) {
    try {
      const data = JSON.parse(await fs.readFile(JSON_PATH, 'utf-8'));
      if (data.length > 0) {
        // 检查数据库是否为空
        const count = db.prepare('SELECT COUNT(*) as count FROM notes').get().count;
        if (count === 0) {
          console.log('Detected legacy JSON data. Starting migration...');
          // 创建一个默认迁移用户 (如果不存在)
          let defaultUser = db.prepare('SELECT id FROM users WHERE username = ?').get('admin');
          if (!defaultUser) {
            const userId = uuidv4();
            const hashed = await bcrypt.hash('admin123', 10);
            db.prepare('INSERT INTO users (id, username, password) VALUES (?, ?, ?)').run(userId, 'admin', hashed);
            defaultUser = { id: userId };
          }

          const insert = db.prepare('INSERT INTO notes (id, user_id, title, content, category, tags, pinned, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
          db.transaction((notes) => {
            for (const n of notes) {
              insert.run(n.id || uuidv4(), defaultUser.id, n.title || '', n.content || '', n.category || '默认', JSON.stringify(n.tags || []), n.pinned ? 1 : 0, n.createdAt || new Date().toISOString(), n.updatedAt || new Date().toISOString());
            }
          })(data);
          
          console.log(`Successfully migrated ${data.length} notes to SQLite.`);
        }
      }
      // 备份并重命名
      await fs.rename(JSON_PATH, JSON_PATH + '.bak');
    } catch (err) {
      console.error('Migration failed:', err);
    }
  }
}

// 所有非 API 请求重定向到前端入口 (支持 React Router)
app.use((req, res, next) => {
  // 只处理 GET 请求且排除 API 和资源路径
  if (req.method === 'GET' && !req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
    res.sendFile(path.join(CLIENT_DIST_PATH, 'index.html'));
  } else {
    next();
  }
});

// 全局错误处理中间件
app.use((err, req, res, next) => {
  console.error('Server Error:', err);
  writeErrorLog(err, req);
  res.status(500).json({ error: '服务器内部错误' });
});

app.listen(PORT, async () => {
  await migrateData();
  console.log(`Server is running on http://localhost:${PORT}`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[Error] 端口 ${PORT} 已被占用！请先关闭其他运行中的项目进程。`);
    writeErrorLog(new Error(`Port ${PORT} in use`));
    process.exit(1);
  } else {
    console.error('Server failed to start:', err);
    writeErrorLog(err);
  }
});

// 优雅退出处理
const gracefulShutdown = () => {
  console.log('\nReceived signal to terminate. Closing database connection...');
  try {
    db.close();
    console.log('SQLite connection closed. Exiting process.');
    process.exit(0);
  } catch (err) {
    console.error('Error during database closure:', err);
    process.exit(1);
  }
};

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);
