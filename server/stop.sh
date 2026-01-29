#!/bin/bash

# 从根目录 .env.production 提取端口号
if [ -f ".env.production" ]; then
    PORT=$(grep '^PORT=' .env.production | cut -d '=' -f 2)
fi
PORT=${PORT:-3000}
echo "正在尝试停止运行在端口 $PORT 的全栈服务..."

PID=$(lsof -t -i:$PORT)

if [ -z "$PID" ]; then
    echo "未发现运行在端口 $PORT 的服务进程。"
else
    echo "正在关闭进程 $PID..."
    kill -9 $PID
    echo "服务已成功停止。"
fi
