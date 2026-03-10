# Quick Start Guide

## For First-Time Setup:

1. **Open PowerShell in this directory**
   ```powershell
   cd jay-patel-portfolio
   ```

2. **Run the setup script:**
   ```powershell
   .\setup.ps1
   ```
   This installs all dependencies for all four projects.

3. **Start all projects:**
   ```powershell
   .\run-all.ps1
   ```
   This opens 4 PowerShell windows, each running a different project.

4. **Open your browser:**
   Navigate to: http://localhost:8080

## Manual Start (Alternative):

If you prefer to run projects individually:

### Terminal 1 - Main Portfolio
```bash
cd jay-portfolio
npm run dev
```

### Terminal 2 - Arcade Machine
```bash
cd jay-arcade-machine
npm run dev
```

### Terminal 3 - Jay OS
```bash
cd jay-os
npm run dev
```

### Terminal 4 - Art Gallery
```bash
cd jay-art-gallery
npm run dev
```

## Common Issues:

**"Cannot run scripts" error:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**Port already in use:**
- Close any applications using ports 8080-8083
- Or modify the webpack configs to use different ports

**Dependencies not installing:**
- Delete all `node_modules` folders
- Run `npm cache clean --force`
- Run setup.ps1 again

## What's Running Where:

| Project | Port | URL |
|---------|------|-----|
| Main Portfolio | 8080 | http://localhost:8080 |
| Arcade Machine | 8081 | http://localhost:8081 |
| Jay OS | 8082 | http://localhost:8082 |
| Art Gallery | 8083 | http://localhost:8083 |

**Note:** All projects must be running for the main portfolio to work correctly, as it embeds the other projects in iframes.

---

Enjoy exploring your portfolio! 🚀
