@echo off
chcp 65001 > nul
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-Content -Path '%~dp0stop.ps1' -Encoding UTF8 | Out-String | Invoke-Expression"
pause
