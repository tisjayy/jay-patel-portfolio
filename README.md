# Jay Patel's Portfolio Collection

Welcome to Jay Patel's complete portfolio collection! This project contains four interconnected Three.js/WebGL applications that showcase skills in 3D development, game development, HTML/CSS, and creative web experiences.

## 🎨 Projects Overview

### 1. **Main Portfolio** (`jay-portfolio`)
The central hub of the portfolio featuring:
- Interactive 3D room environment built with Three.js
- GLSL shaders and visual effects
- Links to all other projects through interactive objects
- Responsive navigation and camera controls

### 2. **Arcade Machine** (`jay-arcade-machine`)
Classic arcade games recreation:
- Snake
- Tetris
- Breakout

### 3. **Jay OS** (`jay-os`)
A simulated Windows OS interface:
- Desktop environment with applications
- Personal interests and references
- HTML/CSS skills showcase

### 4. **Art Gallery** (`jay-art-gallery`)
Virtual first-person art gallery:
- FPS-style navigation
- Side projects displayed as exhibits
- Immersive 3D experience

## 🚀 Quick Start

### Prerequisites
- [Node.js](https://nodejs.org/) (v14 or higher)
- npm (comes with Node.js)
- A modern web browser

### Installation

1. **Clone or navigate to the portfolio folder:**
   ```bash
   cd jay-patel-portfolio
   ```

2. **Install dependencies for all projects:**
   ```powershell
   # PowerShell script to install all dependencies
   cd jay-portfolio; npm install; cd ..
   cd jay-arcade-machine; npm install; cd ..
   cd jay-os; npm install; cd ..
   cd jay-art-gallery; npm install; cd ..
   ```

3. **Run all projects simultaneously:**
   
   Open 4 separate terminal windows and run:
   
   **Terminal 1 - Main Portfolio:**
   ```bash
   cd jay-portfolio
   npm run dev
   ```
   Runs on: http://localhost:8080

   **Terminal 2 - Arcade Machine:**
   ```bash
   cd jay-arcade-machine
   npm run dev
   ```
   Runs on: http://localhost:8081

   **Terminal 3 - Jay OS:**
   ```bash
   cd jay-os
   npm run dev
   ```
   Runs on: http://localhost:8082

   **Terminal 4 - Art Gallery:**
   ```bash
   cd jay-art-gallery
   npm run dev
   ```
   Runs on: http://localhost:8083

4. **Open your browser:**
   Navigate to http://localhost:8080 to view the main portfolio!

## 📁 Project Structure

```
jay-patel-portfolio/
├── jay-portfolio/          # Main portfolio (Three.js 3D environment)
│   ├── src/
│   │   ├── index.html
│   │   ├── script.js
│   │   ├── style.css
│   │   └── Experience/    # Three.js components
│   ├── static/            # Assets (models, textures, etc.)
│   └── package.json
│
├── jay-arcade-machine/     # Classic arcade games
│   ├── src/
│   ├── static/
│   └── package.json
│
├── jay-os/                 # Simulated OS interface
│   ├── src/
│   ├── static/
│   └── package.json
│
├── jay-art-gallery/        # Virtual art gallery
│   ├── src/
│   ├── static/
│   └── package.json
│
└── README.md              # This file
```

## 🎮 How to Use

### Main Portfolio Navigation
Once all projects are running:

1. **Arcade Machine**: Click on the arcade cabinet in the 3D scene
2. **Jay OS**: Click on the left monitor
3. **Art Gallery**: Click on the right monitor
4. **Rubik's Cube**: Interactive Rubik's cube for fun!
5. **Whiteboard**: Draw and create
6. **Social Links**: LinkedIn, GitHub, and itch.io icons

### Controls
- **Mouse**: Look around and interact
- **Navigation**: Click on highlighted objects
- **Banner Menu**: Quick access to different sections

## 🔧 Customization

### Personal Information
Key files to customize:

1. **Main Portfolio:**
   - `jay-portfolio/src/index.html` - Meta tags and title
   - `jay-portfolio/src/Experience/constants.js` - URLs and links
   - `jay-portfolio/readme.md` - Project description

2. **Social Links:**
   Located in `jay-portfolio/src/Experience/constants.js`:
   ```javascript
   export const LINKEDIN_URL = "your-linkedin-url";
   export const GITHUB_URL = "your-github-url";
   export const ITCHIO_URL = "your-itchio-url";
   ```

3. **Sub-project titles:**
   - Each project's `src/index.html` contains the page title
   - Each project's `readme.md` contains project descriptions

## 🏗️ Building for Production

To build each project for production:

```bash
cd [project-name]
npm run build
```

This creates a `dist/` folder with optimized production files.

## 🎨 Technologies Used

- **Three.js** - 3D graphics and WebGL
- **GLSL** - Custom shaders
- **Webpack** - Module bundling
- **GSAP** - Animations
- **HTML5 Canvas** - 2D graphics
- **CSS3** - Styling and animations

## 📝 Original Credits

This portfolio is customized from the amazing work by Joan Ramos Refusta:
- Original Portfolio: https://joanramosrefusta.com/
- GitHub: https://github.com/jrefusta

## 📄 License

Each project is licensed under the MIT License - see individual LICENSE files in each project directory.

## 💡 Tips

- **Performance**: The 3D portfolio is resource-intensive. Use a modern GPU for best experience.
- **Mobile**: Currently optimized for desktop. Mobile optimization is a work in progress.
- **Browsers**: Best experienced in Chrome or Firefox.
- **Development**: Each project runs independently - you can work on one at a time.

## 🐛 Troubleshooting

**Port already in use:**
- Check if another application is using ports 8080-8083
- You can change ports in the webpack config files

**Dependencies issues:**
- Delete `node_modules` folders and run `npm install` again
- Clear npm cache: `npm cache clean --force`

**Build errors:**
- Ensure you're using Node.js v14 or higher
- Check for missing asset files in `static/` folders

## 🚀 Next Steps

1. **Customize Content**: Update personal information in all projects
2. **Add Your Projects**: Replace placeholder projects with your own work
3. **Update Assets**: Replace images, models, and textures with your branding
4. **Deploy**: Host on Vercel, Netlify, or your preferred platform
5. **Domain**: Connect a custom domain for professional presence

---

**Happy Coding! ✨**

For questions or issues, feel free to explore the original repositories or customize as needed.
