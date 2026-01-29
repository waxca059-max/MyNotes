import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = path.resolve(__dirname, process.env.DATABASE_PATH || './data/notes.db');
const dbDir = path.dirname(dbPath);

if (!existsSync(dbDir)) {
  mkdirSync(dbDir, { recursive: true });
}

const db = new Database(dbPath);

// 初始化数据库表
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS notes (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT DEFAULT '',
    content TEXT DEFAULT '',
    category TEXT DEFAULT '默认',
    tags TEXT DEFAULT '[]',
    pinned INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  );

  -- 创建 FTS5 虚拟表用于全文搜索 (独立存储核心文本以防 UUID 冲突)
  CREATE VIRTUAL TABLE IF NOT EXISTS notes_fts USING fts5(
    id,
    user_id,
    title,
    content
  );

  -- 触发器：同步插入
  CREATE TRIGGER IF NOT EXISTS notes_ai AFTER INSERT ON notes BEGIN
    INSERT INTO notes_fts(rowid, id, user_id, title, content) VALUES (new.rowid, new.id, new.user_id, new.title, new.content);
  END;

  -- 触发器：同步删除
  CREATE TRIGGER IF NOT EXISTS notes_ad AFTER DELETE ON notes BEGIN
    DELETE FROM notes_fts WHERE rowid = old.rowid;
  END;

  -- 触发器：同步更新
  CREATE TRIGGER IF NOT EXISTS notes_au AFTER UPDATE ON notes BEGIN
    DELETE FROM notes_fts WHERE rowid = old.rowid;
    INSERT INTO notes_fts(rowid, id, user_id, title, content) VALUES (new.rowid, new.id, new.user_id, new.title, new.content);
  END;

  -- 存量数据初始化 (如果 FTS 表是空的)
  INSERT OR IGNORE INTO notes_fts(rowid, id, user_id, title, content) 
  SELECT rowid, id, user_id, title, content FROM notes;
`);

export default db;
