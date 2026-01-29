# 强制设置控制台输出为 UTF8 以解决中文乱码
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
$port = 3000
Write-Host "正在尝试停止运行在端口 $port 的全栈服务..." -ForegroundColor Cyan

$processId = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | Get-Unique

if ($processId) {
    $processName = (Get-Process -Id $processId).ProcessName
    Write-Host "发现进程 $processName (ID: $processId)，正在关闭..." -ForegroundColor Yellow
    Stop-Process -Id $processId -Force
    Write-Host "服务已成功停止。" -ForegroundColor Green
} else {
    Write-Host "未发现运行在端口 $port 的服务进程。" -ForegroundColor Gray
}
