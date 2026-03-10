# Jay Patel Portfolio - Setup Script
# This script installs dependencies for all four projects

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  Jay Patel's Portfolio - Setup & Installation" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Check if Node.js is installed
Write-Host "Checking Node.js installation..." -ForegroundColor Yellow
try {
    $nodeVersion = node --version
    Write-Host "[OK] Node.js is installed: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[FAIL] Node.js is not installed!" -ForegroundColor Red
    Write-Host "Please install Node.js from https://nodejs.org/" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Array of project directories
$projects = @(
    "jay-portfolio",
    "jay-arcade-machine",
    "jay-os",
    "jay-art-gallery"
)

# Install dependencies for each project
foreach ($project in $projects) {
    Write-Host "Installing dependencies for $project..." -ForegroundColor Yellow
    
    if (Test-Path $project) {
        Push-Location $project
        
        try {
            npm install
            Write-Host "[OK] $project dependencies installed successfully!" -ForegroundColor Green
        } catch {
            Write-Host "[FAIL] Failed to install dependencies for $project" -ForegroundColor Red
        }
        
        Pop-Location
    } else {
        Write-Host "[FAIL] Directory $project not found!" -ForegroundColor Red
    }
    
    Write-Host ""
}

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  Installation Complete!" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "1. Run 'npm run dev' in each project directory" -ForegroundColor White
Write-Host "   - jay-portfolio (port 8080)" -ForegroundColor White
Write-Host "   - jay-arcade-machine (port 8081)" -ForegroundColor White
Write-Host "   - jay-os (port 8082)" -ForegroundColor White
Write-Host "   - jay-art-gallery (port 8083)" -ForegroundColor White
Write-Host ""
Write-Host "Or use the 'run-all.ps1' script to start all projects!" -ForegroundColor Cyan
Write-Host ""
