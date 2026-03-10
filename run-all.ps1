# Jay Patel Portfolio - Run All Projects
# This script starts all four projects in separate PowerShell windows

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  Starting Jay Patel's Portfolio Projects" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

$baseDir = Get-Location

# Function to start a project in a new PowerShell window
function Start-Project {
    param(
        [string]$ProjectName,
        [string]$Port
    )
    
    if (Test-Path $ProjectName) {
        Write-Host "Starting $ProjectName on port $Port..." -ForegroundColor Yellow
        
        $projectPath = Join-Path $baseDir $ProjectName
        
        Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$projectPath'; Write-Host 'Running $ProjectName on http://localhost:$Port' -ForegroundColor Cyan; npm run dev"
        
        Write-Host "[OK] $ProjectName launched!" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Directory $ProjectName not found!" -ForegroundColor Red
    }
}

# Start each project
Start-Project -ProjectName "jay-portfolio" -Port "8080"
Start-Sleep -Seconds 2

Start-Project -ProjectName "jay-arcade-machine" -Port "8081"
Start-Sleep -Seconds 2

Start-Project -ProjectName "jay-os" -Port "8082"
Start-Sleep -Seconds 2

Start-Project -ProjectName "jay-art-gallery" -Port "8083"

# Start the chatbot proxy (Bedrock API relay) for jay-os
$jayOsPath = Join-Path $baseDir "jay-os"
Write-Host "Starting chatbot proxy on port 8085..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$jayOsPath'; node proxy.js"
Write-Host "[OK] Chatbot proxy launched!" -ForegroundColor Green

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "  All Projects Started!" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Projects running on:" -ForegroundColor Yellow
Write-Host "  Main Portfolio:   http://localhost:8080" -ForegroundColor White
Write-Host "  Arcade Machine:   http://localhost:8081" -ForegroundColor White
Write-Host "  Jay OS:           http://localhost:8082" -ForegroundColor White
Write-Host "  Art Gallery:      http://localhost:8083" -ForegroundColor White
Write-Host ""
Write-Host "Open http://localhost:8080 in your browser to start!" -ForegroundColor Cyan
Write-Host ""
Write-Host "Note: Each project is running in a separate window." -ForegroundColor Gray
Write-Host "Close the windows to stop the dev servers." -ForegroundColor Gray
Write-Host ""
