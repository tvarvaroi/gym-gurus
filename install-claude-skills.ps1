# Claude Skills Installer
# Installs all skills from alirezarezvani/claude-skills into Claude Code

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Claude Skills Installer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Define paths
$TempDir = "$env:TEMP\claude-skills-install"
$GlobalSkillsDir = "$env:USERPROFILE\.claude\skills"
$GlobalCommandsDir = "$env:USERPROFILE\.claude\commands"
$RepoUrl = "https://github.com/alirezarezvani/claude-skills.git"

# Skill folders to install
$SkillFolders = @(
    "agents",
    "business-growth",
    "c-level-advisor",
    "documentation",
    "engineering-team",
    "engineering",
    "finance",
    "marketing-skill",
    "product-team",
    "project-management",
    "ra-qm-team",
    "standards",
    "templates"
)

# Step 1: Check git is available
Write-Host "[1/5] Checking prerequisites..." -ForegroundColor Yellow
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "ERROR: git is not installed. Please install it from https://git-scm.com" -ForegroundColor Red
    exit 1
}
Write-Host "  git found" -ForegroundColor Green

# Step 2: Clone repo
Write-Host ""
Write-Host "[2/5] Cloning claude-skills repository..." -ForegroundColor Yellow

if (Test-Path $TempDir) {
    Remove-Item -Recurse -Force $TempDir
}

git clone --depth 1 $RepoUrl $TempDir

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to clone repository." -ForegroundColor Red
    exit 1
}
Write-Host "  Cloned successfully" -ForegroundColor Green

# Step 3: Create target directories
Write-Host ""
Write-Host "[3/5] Creating Claude directories..." -ForegroundColor Yellow

New-Item -ItemType Directory -Force -Path $GlobalSkillsDir | Out-Null
New-Item -ItemType Directory -Force -Path $GlobalCommandsDir | Out-Null

Write-Host "  $GlobalSkillsDir" -ForegroundColor Green
Write-Host "  $GlobalCommandsDir" -ForegroundColor Green

# Step 4: Copy all skill folders
Write-Host ""
Write-Host "[4/5] Installing skills..." -ForegroundColor Yellow

foreach ($folder in $SkillFolders) {
    $src = Join-Path $TempDir $folder
    $dst = Join-Path $GlobalSkillsDir $folder

    if (Test-Path $src) {
        Copy-Item -Recurse -Force $src $dst
        Write-Host "  Installed: $folder" -ForegroundColor Green
    } else {
        Write-Host "  Skipped (not found): $folder" -ForegroundColor DarkGray
    }
}

# Copy .claude/commands (slash commands)
$commandsSrc = Join-Path $TempDir ".claude\commands"
if (Test-Path $commandsSrc) {
    Copy-Item -Recurse -Force "$commandsSrc\*" $GlobalCommandsDir
    Write-Host "  Installed: slash commands (.claude/commands)" -ForegroundColor Green
}

# Step 5: Cleanup
Write-Host ""
Write-Host "[5/5] Cleaning up..." -ForegroundColor Yellow
Remove-Item -Recurse -Force $TempDir
Write-Host "  Done" -ForegroundColor Green

# Summary
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "   Installation Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Skills installed to:" -ForegroundColor White
Write-Host "  $GlobalSkillsDir" -ForegroundColor Gray
Write-Host ""
Write-Host "Slash commands installed to:" -ForegroundColor White
Write-Host "  $GlobalCommandsDir" -ForegroundColor Gray
Write-Host ""
Write-Host "Restart Claude Code and you're good to go!" -ForegroundColor Cyan
Write-Host ""
