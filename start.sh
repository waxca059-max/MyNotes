#!/bin/bash

PORT=3000
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

echo "正在启动全栈服务..."
cd server
PORT=$PORT node index.js
