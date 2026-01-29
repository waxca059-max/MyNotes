# 强制设置控制台输出为 UTF8 以解决中文乱码
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8
# 从同级目录读取端口号 (.env.production)
$prodEnvFile = Join-Path $PSScriptRoot ".env.production"
$port = 3000

if (Test-Path $prodEnvFile) {
    $portLine = Get-Content $prodEnvFile | Where-Object { $_ -match "^PORT=(\d+)" }
    if ($portLine -and $portLine -match "PORT=(\d+)") {
        $port = $Matches[1]
    }
}
Write-Host "正在检查端口 $port 占用情况..." -ForegroundColor Cyan

# 查找占用端口的进程 ID
$processId = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | Get-Unique

if ($processId) {
    Write-Host "发现进程 ID $processId 正在占用端口 $port，正在强制关闭..." -ForegroundColor Yellow
    Stop-Process -Id $processId -Force
    Start-Sleep -Seconds 1
}

if (-not (Test-Path "$PSScriptRoot/node_modules")) {
    Write-Host "检测到 node_modules 缺失，正在安装生产依赖..." -ForegroundColor Cyan
    Set-Location $PSScriptRoot
    npm install --omit=dev
}

Write-Host "正在启动全栈服务 (生产模式)..." -ForegroundColor Green
$env:PORT = $port
$env:NODE_ENV = "production"
node index.js
