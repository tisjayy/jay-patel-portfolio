# Customization Guide for Jay Patel's Portfolio

This guide will help you personalize the portfolio with your own information, projects, and styling.

## 🎯 Essential Customizations

### 1. Personal Information

#### Main Portfolio (`jay-portfolio/src/index.html`)
```html
<!-- Update meta tags (lines 7-23) -->
<title>Your Name ☕</title>
<meta itemprop="name" content="Your Name ☕">
<meta itemprop="description" content="Your Name's Portfolio.">

<!-- Update loading screen (line 38) -->
<div class="loadingScreen"> YOUR <br> NAME </div>
```

#### Social Links (`jay-portfolio/src/Experience/constants.js`)
```javascript
// Update URLs (lines 186-188)
export const LINKEDIN_URL = "https://www.linkedin.com/in/your-profile/";
export const GITHUB_URL = "https://github.com/yourusername";
export const ITCHIO_URL = "https://yourusername.itch.io/";
```

### 2. Project URLs

If deploying online, update these in `jay-portfolio/src/Experience/constants.js`:

```javascript
// Lines 30, 91, 114
export const ARCADE_IFRAME_SRC = "https://your-arcade-machine.vercel.app";
export const LEFT_MONITOR_IFRAME_SRC = "https://your-os.vercel.app";
export const RIGHT_MONITOR_IFRAME_SRC = "https://your-art-gallery.vercel.app";
```

### 3. README Files

Update each project's `readme.md`:
- `jay-portfolio/readme.md`
- `jay-arcade-machine/readme.md`
- `jay-os/readme.md`
- `jay-art-gallery/readme.md`

Replace descriptions with your own story and project details.

## 🎨 Visual Customizations

### Colors and Styling

#### Main Portfolio
- **CSS**: `jay-portfolio/src/style.css`
- **Shaders**: `jay-portfolio/src/Experience/shaders/`

#### Background Color
In `constants.js`, look for `Color` objects:
```javascript
export const CRT_UNIFORMS = {
  uBaseColor: new Color(0.1, 0.1, 0.1), // Change these RGB values
  // ...
}
```

### 3D Assets

#### Replace Models
Assets are in `jay-portfolio/static/`:
- Models: Replace `.glb` or `.gltf` files
- Textures: Update images
- Icons: Replace favicon and other icons

Update asset references in `jay-portfolio/src/Experience/assets.js`

## 📝 Content Customization

### Jay OS (`jay-os/src/index.html`)

This is the most personal section with many hardcoded references:

1. **Resume**: Replace `jay-os/static/resume/` files
2. **Desktop Icons**: Update in HTML (starts around line 61)
3. **Chat Messages**: Update personal chat logs (lines 230+)
4. **Email**: Update contact form references

### Art Gallery (`jay-art-gallery/`)

1. **Paintings**: Replace in `static/assets/paintings/`
2. **Descriptions**: Update text files in `static/assets/descriptions/`
3. **Asset References**: Update `src/Experience/assets.js`

### Arcade Machine

Games are in `jay-arcade-machine/src/`:
- `Snake.js`
- `Tetris.js`
- `Breakout.js`

Customize game colors, speeds, and mechanics as desired.

## 🚀 Deployment Customizations

### Vercel Deployment

1. **Create Vercel Account**: https://vercel.com
2. **Connect GitHub Repository**
3. **Deploy Each Project Separately**:
   - jay-portfolio → your-portfolio.vercel.app
   - jay-arcade-machine → your-arcade.vercel.app
   - jay-os → your-os.vercel.app
   - jay-art-gallery → your-gallery.vercel.app

4. **Update URLs**: After deployment, update the iframe URLs in `constants.js`

### Custom Domain

In Vercel project settings:
1. Go to Domains
2. Add your custom domain
3. Update all references in the code

## 📦 Package.json Updates

Already customized, but you can add:
```json
{
  "name": "your-project-name",
  "version": "1.0.0",
  "description": "Your description",
  "author": "Your Name",
  "repository": "https://github.com/yourusername/your-repo"
}
```

## 🎮 Interactive Elements

### Rubik's Cube
Behavior defined in `jay-portfolio/src/Experience/RubiksCube.js`

### Whiteboard
Canvas drawing in `jay-portfolio/src/Experience/Whiteboard.js`

### Camera Positions
Adjust views in `constants.js`:
```javascript
export const CAMERA_POSITION = new Vector3(-23, 17, 23);
export const CAMERA_TARGET = new Vector3(0, 2.5, 0);
```

## 📊 Analytics (Optional)

Add Google Analytics or similar:

In each `src/index.html`:
```html
<head>
  <!-- ... existing head content ... -->
  
  <!-- Google Analytics -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=YOUR-ID"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'YOUR-ID');
  </script>
</head>
```

## 🔍 SEO Optimization

Update meta tags in each project's `index.html`:

```html
<meta name="description" content="Your portfolio description">
<meta name="keywords" content="your, keywords, here">
<meta name="author" content="Your Name">
```

## ⚡ Performance Tips

1. **Optimize Images**: Use compressed formats (WebP, KTX2)
2. **Lazy Load**: Add lazy loading for heavy assets
3. **Code Splitting**: Already configured in webpack
4. **Minification**: Run `npm run build` for production

## 🎓 Learning Resources

To customize further, learn:
- **Three.js**: https://threejs.org/
- **GLSL Shaders**: https://thebookofshaders.com/
- **WebGL**: https://webglfundamentals.org/
- **Webpack**: https://webpack.js.org/

## 📸 Screenshots

Generate new screenshots for social media:
1. Run projects locally
2. Capture screenshots
3. Update `og:image` meta tags
4. Update README images

## 🔄 Updating Dependencies

Periodically update packages:
```bash
npm update
```

For major updates:
```bash
npm outdated
npm install package-name@latest
```

## 💡 Pro Tips

1. **Git Version Control**: Initialize git in each project folder
2. **Branch Strategy**: Use `main` for stable, `dev` for development
3. **Testing**: Test on multiple browsers before deployment
4. **Mobile**: Consider adding responsive design (currently desktop-optimized)
5. **Accessibility**: Add ARIA labels for better accessibility

## 🆘 Need Help?

- Check original repos: https://github.com/jrefusta
- Three.js community: https://discourse.threejs.org/
- Stack Overflow: Tag questions with `three.js`, `webgl`

---

Happy customizing! Make this portfolio truly yours! 🎨✨
