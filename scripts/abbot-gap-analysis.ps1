param([switch]$Fix)

$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path | Split-Path -Parent
Write-Host "Abbot Gap Analysis starting at $root" -ForegroundColor Cyan

$findings = @()
function Add-Finding([string]$area, [string]$issue, [string]$fix) {
  $findings += [pscustomobject]@{ area=$area; issue=$issue; fix=$fix }
}

function Ensure-Directory([string]$path) {
  if (-not (Test-Path $path)) { New-Item -ItemType Directory -Path $path | Out-Null }
}

# 1) Continue config schema checks
$cfgPath = Join-Path $root ".continue\config.yaml"
if (Test-Path $cfgPath) {
  $cfg = Get-Content $cfgPath -Raw
  $dirty = $false
  if ($cfg -match 'apiKey:') { Add-Finding "Continue" "apiKey present in repo" "Remove apiKey; use continue-proxy + User settings secrets"; if ($Fix) { $cfg = ($cfg -split "`r?`n") | Where-Object { $_ -notmatch '^\s*apiKey\s*:' } | ForEach-Object { $_ } | Out-String; $dirty = $true } }
  if ($cfg -match 'onPremProxyUrl|orgScopeId') { Add-Finding "Continue" "Proxy fields in config rejected by your schema" "Remove them; keep only models with provider: continue-proxy"; if ($Fix) { $cfg = ($cfg -split "`r?`n") | Where-Object { $_ -notmatch '^\s*(onPremProxyUrl|orgScopeId)\s*:' } | ForEach-Object { $_ } | Out-String; $dirty = $true } }
  # Ensure minimum models exist
  if ($Fix) {
    if ($cfg -notmatch 'name:\s*openai/gpt-5') {
      $cfg += "`nmodels:`n  - name: openai/gpt-5`n    provider: continue-proxy`n    model: gpt-5`n"
    }
    if ($cfg -notmatch 'name:\s*openai/gpt-4') {
      if ($cfg -notmatch 'models:\s*$') { $cfg += "`n" }
      $cfg += "  - name: openai/gpt-4`n    provider: continue-proxy`n    model: gpt-4o`n"
    }
    $dirty = $true
  }
  if ($Fix -and $dirty) { Set-Content -LiteralPath $cfgPath -Value ($cfg.TrimEnd()+"`n") -Encoding utf8 }
} else {
  Add-Finding "Continue" ".continue/config.yaml missing" "Create it with continue-proxy models (gpt-5 and gpt-4o)"
  if ($Fix) {
    Ensure-Directory (Join-Path $root ".continue")
    @(
      'name: Maturion Workspace',
      'version: 1.0.0',
      'schema: v1',
      '',
      'models:',
      '  - name: openai/gpt-5',
      '    provider: continue-proxy',
      '    model: gpt-5',
      '',
      '  - name: openai/gpt-4',
      '    provider: continue-proxy',
      '    model: gpt-4o',
      '',
      'mcpServers: []'
    ) | Set-Content -LiteralPath $cfgPath -Encoding utf8
  }
}

# 2) Agent files constraints
$agentDir = Join-Path $root ".continue\agents"
if (Test-Path $agentDir) {
  Get-ChildItem $agentDir -Filter *.yaml | ForEach-Object {
    $path = $_.FullName
    $c = Get-Content $path -Raw
    $hasInstr = $c -match '^\s*instructions\s*:'
    $hasModels = $c -match '^\s*models\s*:'
    if ($hasInstr) { Add-Finding "Agents" ("{0} has instructions" -f $_.Name) "Remove instructions; schema disallows" }
    if ($hasModels) { Add-Finding "Agents" ("{0} has models" -f $_.Name) "Remove models; keep agent minimal" }
    if ($Fix -and ($hasInstr -or $hasModels)) {
      $name = ([System.IO.Path]::GetFileNameWithoutExtension($_.Name)).ToLower()
      @(
        "name: $name",
        'version: 1.0.0',
        'schema: v1',
        '',
        'mcpServers: []'
      ) | Set-Content -LiteralPath $path -Encoding utf8
    }
  }
}

# 3) VS Code User settings: secrets present?
$userSettings = Join-Path $env:APPDATA "Code\User\settings.json"
if (Test-Path $userSettings) {
  try {
    $json = Get-Content $userSettings -Raw | ConvertFrom-Json
    if (-not $json."continue.secrets" -or -not $json."continue.secrets".OPENAI_API_KEY) {
      Add-Finding "UserSettings" "OPENAI_API_KEY missing" "Add to continue.secrets in User settings"
    }
  } catch {
    Add-Finding "UserSettings" "settings.json not valid JSON" "Fix JSON syntax in User settings"
  }
} else {
  Add-Finding "UserSettings" "User settings.json not found" "Create and add continue.secrets with OPENAI_API_KEY"
}

# 4) Extensions sanity
$extJsonPath = Join-Path $root ".vscode\extensions.json"
$requiredExts = @(
  'Continue.continue','esbenp.prettier-vscode','dbaeumer.vscode-eslint','eamodio.gitlens',
  'streetsidesoftware.code-spell-checker','bradlc.vscode-tailwindcss','supabase.vscode-supabase',
  'redhat.vscode-yaml','usernamehw.errorlens','ms-vscode.vscode-typescript-next'
)
if (Test-Path $extJsonPath) {
  $extJson = Get-Content $extJsonPath -Raw | ConvertFrom-Json
  foreach ($r in $requiredExts) {
    if ($extJson.recommendations -notcontains $r) {
      Add-Finding "Extensions" ("Missing recommendation: {0}" -f $r) "Add to .vscode/extensions.json"
      if ($Fix) { $extJson.recommendations += $r }
    }
  }
  if ($Fix) { ($extJson | ConvertTo-Json -Depth 10) | Set-Content -LiteralPath $extJsonPath -Encoding utf8 }
} else {
  Add-Finding "Extensions" ".vscode/extensions.json missing" "Create with recommended list"
  if ($Fix) {
    Ensure-Directory (Join-Path $root ".vscode")
    $obj = [pscustomobject]@{ recommendations = $requiredExts }
    ($obj | ConvertTo-Json -Depth 5) | Set-Content -LiteralPath $extJsonPath -Encoding utf8
  }
}

# 5) Output
if ($findings.Count -eq 0) {
  Write-Host "✅ No gaps found." -ForegroundColor Green
} else {
  Write-Host "❌ Gaps found:" -ForegroundColor Yellow
  $findings | Format-Table -AutoSize
}

