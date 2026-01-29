# 强制设置控制台输出为 UTF8 以解决中文乱码
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$port = 3000
Write-Host "正在检查端口 $port 占用情况..." -ForegroundColor Cyan

# 查找占用端口的进程 ID
$processId = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | Get-Unique

if ($processId) {
    Write-Host "发现进程 ID $processId 正在占用端口 $port，正在强制关闭..." -ForegroundColor Yellow
    Stop-Process -Id $processId -Force
    Start-Sleep -Seconds 1
}

Write-Host "正在启动全栈服务..." -ForegroundColor Green
cd server
$env:PORT = $port
node index.js
