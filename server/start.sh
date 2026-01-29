#!/bin/bash

# 从同级目录 .env.production 提取端口号
if [ -f ".env.production" ]; then
    PORT=$(grep '^PORT=' .env.production | cut -d '=' -f 2)
fi
PORT=${PORT:-3000}
echo "正在检查端口 $PORT 占用情况..."

# 查找占用端口的 PID
PID=$(lsof -t -i:$PORT)

if [ -z "$PID" ]; then
    echo "端口 $PORT 未被占用。"
else
    echo "发现进程 $PID 正在占用端口 $PORT，正在强制关闭..."
    kill -9 $PID
    sleep 1
fi

echo "正在启动全栈服务 (生产模式)..."
PORT=$PORT NODE_ENV=production node index.js
