$ErrorActionPreference = 'Stop'
$workspacePath = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
$runtimeNode = (Get-Command node).Source
$nextCli = Join-Path $workspacePath 'node_modules\next\dist\bin\next'
$logPath = Join-Path $workspacePath 'tmp'
New-Item -ItemType Directory -Force -Path $logPath | Out-Null
$appPath = Join-Path $workspacePath 'apps\qindeel'
Start-Process -FilePath $runtimeNode -ArgumentList @(('"'+$nextCli+'"'),'dev','-p',3001) -WorkingDirectory $appPath -WindowStyle Hidden -RedirectStandardOutput (Join-Path $logPath 'qindeel.log') -RedirectStandardError (Join-Path $logPath 'qindeel.error.log')
Write-Output 'qindeel: http://localhost:3001'
