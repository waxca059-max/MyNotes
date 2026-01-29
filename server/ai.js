import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const LOG_FILE = path.join(__dirname, 'logs', 'ai.log');

/**
 * 这是一个极简且鲁棒的 AI 服务封装。
 * 它支持 Google Gemini (免费档)，并预留了扩展接口。
 */

// 只有在配置了 Key 时才初始化
const genAI = process.env.GEMINI_API_KEY ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY) : null;
const model = genAI ? genAI.getGenerativeModel({ model: 'gemini-pro' }) : null;

// --- 日志助手 ---
const writeLog = async (data) => {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${JSON.stringify(data, null, 2)}\n${'-'.repeat(80)}\n`;
  try {
    await fs.appendFile(LOG_FILE, logEntry);
  } catch (err) {
    console.error('[Logger] Failed to write log:', err.message);
  }
};

// --- 统一模型适配层 ---
const callAI = async (input) => {
  const startTime = Date.now();
  const errors = [];
  
  const logData = {
    request: {
      openai_config: {
        model: process.env.OPENAI_MODEL || 'deepseek-ai/DeepSeek-V3',
        base_url: process.env.OPENAI_BASE_URL
      }
    }
  };

  // 准备 OpenAI 格式的消息
  const messages = Array.isArray(input) 
    ? input 
    : [{ role: 'user', content: String(input) }];

  // 准备 Gemini 格式的降级文本
  const flattenedPrompt = Array.isArray(input)
    ? input.map(m => `${m.role === 'system' ? 'Instruction' : m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n')
    : String(input);

  let result = null;

  // 方案 A: 优先尝试 OpenAI
  if (process.env.OPENAI_API_KEY) {
    try {
      const requestBody = {
        model: process.env.OPENAI_MODEL || 'deepseek-ai/DeepSeek-V3',
        messages: messages,
        temperature: 0.7
      };
      logData.request.raw_body = requestBody;

      const response = await fetch(`${process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1'}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      const data = await response.json();
      logData.raw_response = data; // 记录原始完整响应

      if (data.error || data.message) {
        throw new Error(data.error?.message || data.message || 'API 业务错误');
      }
      if (data.choices && data.choices[0]) {
        result = data.choices[0].message.content.trim();
        logData.provider = 'OpenAI-Compatible';
      }
    } catch (err) {
      errors.push(`首选方案失败: ${err.message}`);
    }
  }

  // 方案 B: 备选尝试 Gemini
  if (!result && model) {
    try {
      logData.request.gemini_prompt = flattenedPrompt;
      const res = await model.generateContent(flattenedPrompt);
      const response = await res.response;
      result = response.text().trim();
      logData.provider = 'Gemini-SDK';
      logData.raw_response = response; // 记录 Gemini 的原始响应
    } catch (err) {
      errors.push(`备选方案失败: ${err.message}`);
    }
  }

  const duration = Date.now() - startTime;
  logData.duration = `${duration}ms`;

  if (result) {
    logData.final_answer = result;
    writeLog(logData); // 异步写入日志
    return result;
  }

  const finalError = errors.length > 0 ? errors.join('; ') : '未配置服务';
  logData.error = finalError;
  writeLog(logData);
  throw new Error(finalError);
};

export const aiService = {
  /**
   * 生成笔记摘要
   */
  async summarize(content) {
    if (!content || content.length < 10) throw new Error('内容太短，无法生成摘要。至少需要10个字符。');
    const prompt = `请为以下内容生成100字以内的摘要：\n\n${content}`;
    try {
      return await callAI(prompt);
    } catch (error) {
      console.error('AI Error:', error.message);
      throw error; // 抛出异常，让后端路由返回 500
    }
  },

  /**
   * 自动生成标签
   */
  async suggestTags(content) {
    if (!content) return [];
    const prompt = `分析内容并输出3个关键词标签，用半角逗号隔开，不要输出其他文字：\n\n${content}`;
    try {
      const tagsText = await callAI(prompt);
      return tagsText.split(/[,，]/).map(t => t.trim()).filter(t => t.length > 0);
    } catch (error) {
      return [];
    }
  },

  async chat(content, question, history = []) {
    if (!question) throw new Error('请输入您想提问的内容');
    
    // --- 健壮性优化：滑动窗口记忆 ---
    const recentHistory = history.slice(-10);

    // 标准化消息构建 (OpenAI 协议)
    const messages = [
      { 
        role: 'system', 
        content: `你是一个专业的笔记伴侣。以下是一篇笔记的内容作为参考背景：\n---\n${content || '(该笔记目前为空)'}\n---\n请基于背景和历史对话片段提供简洁、专业的回答。` 
      },
      ...recentHistory,
      { role: 'user', content: question }
    ];

    try {
      return await callAI(messages);
    } catch (error) {
      console.error('AI Chat Error:', error.message);
      throw error;
    }
  },

  /**
   * 智能排版 (美化 Markdown 内容)
   */
  async format(content) {
    if (!content || content.trim().length < 5) {
      throw new Error('内容太短，无法进行有效排版。');
    }

    const prompt = `你是一个专业的文档排版专家。请对以下 Markdown 内容进行一键智能润色和排版。
要求：
1. 修复中英文混排时的空格（如：中文与 English 之间增加空格）。
2. 修复 Markdown 语法的错误或不规范（如：标题后的空格、列表嵌套缩进）。
3. 优化分段与逻辑结构，增加必要的分隔线使内容更清晰。
4. 修正明显的错别字，保持语言通顺。
5. **绝对不要修改内容的原始含义**，也不要增加多余的废话评价。
6. **段落首行缩进**：在每个正文段落开头增加两个全角空格（　　），使其符合中文写作排版规范。
直接输出排版完成后的全文内容：

---
${content}
---`;

    try {
      return await callAI(prompt);
    } catch (error) {
      console.error('AI Format Error:', error.message);
      throw error;
    }
  }
};
