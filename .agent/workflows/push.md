---
description: 提交并推送到当前分支 (Commit and push to current branch)
---

1. 检查当前工作区状态
   git status

2. 将所有更改添加到暂存区
   git add .

3. 提交更改 (使用描述性的中文信息)
   // 格式建议: <type>(<scope>): <subject>
   git commit -m "<type>: <description>"

4. 推送到远程仓库的当前分支
   // 自动推送到 origin 的当前活动分支
   git push origin $(git branch --show-current)
