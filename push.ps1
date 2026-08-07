#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Commit all staged/unstaged changes and push to origin.

.USAGE
    .\push.ps1 "your commit message"
    .\push.ps1          # uses a timestamped default message
#>
param(
    [string]$Message = ""
)

Set-Location $PSScriptRoot

if (-not $Message) {
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm"
    $Message = "chore: update $timestamp"
}

git add --all
git commit -m $Message
git push origin master

Write-Host ""
Write-Host "✅  Pushed: $Message" -ForegroundColor Green
