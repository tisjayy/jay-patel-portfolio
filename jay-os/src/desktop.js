import DragSelect from "dragselect";
import Resume from "../static/resume/Resume_Jay.pdf";
import Experience from "./experience";
import AboutMe from "./about-me";
import Contact from "./contact";
const experience = new Experience();
const aboutMe = new AboutMe();
const contact = new Contact();

experience.activateEvents();
aboutMe.activateEvents();
contact.activateEvents();

class Desktop {
  constructor() {
    this.maxZIndex = 10;
    this.windowWidth = window.innerWidth;
    this.windowHeight = window.innerHeight;
    this.ds = new DragSelect({
      selectables: document.querySelectorAll(".apps"),
      callback: (e) => console.log(e),
    });
    this.windowsMenu = document.querySelector(".open-windows-menu");
    this.footer = document.getElementById("footer");
    this.windowsIcon = document.getElementById("windows-icon-section");
    this.windowsMenu = document.querySelector(".open-windows-menu");
    this.titleBar = document.querySelectorAll(".title-bar");
    this.bottomApps = document.querySelectorAll(".taskbar-app");
    this.currentDate = document.getElementById("current-date");
    this.hoursMinutes = document.getElementById("hours-minutes");
    this.apps = document.querySelectorAll(".apps");
    this.minimizeButtons = document.querySelectorAll(".minimize");
    this.bottomApps = document.querySelectorAll(".taskbar-app");
    this.closeButtons = document.querySelectorAll(".close");
    this.restoreButtons = document.querySelectorAll(".restore");
  }

  activateEvents() {
    const experience = new Experience();
    const aboutMe = new AboutMe();
    const contact = new Contact();

    experience.activateEvents();
    aboutMe.activateEvents();
    contact.activateEvents();

    this.activateFooterEvent();
    this.activateOutsideWindowsIconEvent();
    this.activateWindowsIconEvent();
    this.activateTitleBarEvents();
    this.activateDateTimeUpdates();
    this.activateAppEvents();

    this.activateBottomAppEvents();
    this.activateMinimizeButtons();
    this.activateCloseButtons();
    this.activateRestoreButtons();
    this.activateMouseUpEvent();
    this.activateKeyboardForwarding();

    setInterval(this.activateDateTimeUpdates, 1000);
    this.activateDateTimeUpdates();
  }
  activateMouseUpEvent = () => {
    document.addEventListener("mouseup", () => {
      window.parent.postMessage("mouseup", "*");
      if (this.ds.stopped) {
        this.ds.start();
      }
    });
    document.addEventListener("touchend", () => {
      window.parent.postMessage("mouseup", "*");
      if (this.ds.stopped) {
        this.ds.start();
      }
    });
    document.addEventListener("mousedown", () => {
      window.parent.postMessage("mousedown", "*");
    });
  };

  activateKeyboardForwarding = () => {
    document.addEventListener("keydown", (event) => {
      const arcadeWindow = document.getElementById("arcade");
      if (arcadeWindow && arcadeWindow.style.display !== "none") {
        const iframe = arcadeWindow.querySelector("iframe");
        if (iframe) {
          iframe.contentWindow.postMessage({ type: "keyDownParent", key: event.key }, "*");
        }
      }
    });
  };

  activateFooterEvent = () => {
    this.footer.addEventListener("mousedown", () => {
      if (!this.ds.stopped) {
        this.ds.stop();
      }
    });
    this.footer.addEventListener("touchstart", () => {
      if (!this.ds.stopped) {
        this.ds.stop();
      }
    }, { passive: true });
  };

  activateWindowsIconEvent = () => {
    this.windowsIcon.addEventListener("click", () => {
      this.openMenu();
    });
  };

  openMenu = () => {
    if (this.windowsMenu.getAttribute("style") == null) {
      this.windowsMenu.setAttribute(
        "style",
        "display: flex; transition: all 0.2s ease-in"
      );
    } else {
      this.windowsMenu.removeAttribute("style");
    }
  };

  activateOutsideWindowsIconEvent = () => {
    const closeMenu = (event) => {
      if (!event.target.closest(".open-windows-menu") && !event.target.closest("#windows-icon-section")) {
        this.windowsMenu.removeAttribute("style");
      }
    };
    document.addEventListener("mousedown", closeMenu);
    document.addEventListener("touchstart", closeMenu, { passive: true });
  };

  startDrag = (event) => {
    const isTouch = event.touches !== undefined;
    const clientX = isTouch ? event.touches[0].clientX : event.clientX;
    const clientY = isTouch ? event.touches[0].clientY : event.clientY;
    if (!this.ds?.stopped) {
      this.ds.stop();
    }
    this.element = event.srcElement.parentElement;
    this.incrementMaxZIndex(this.element);
    this.initialMouseX = clientX;
    this.initialMouseY = clientY;
    this.initialWindowX = parseFloat(
      window.getComputedStyle(this.element).left
    );
    this.initialWindowY = parseFloat(window.getComputedStyle(this.element).top);

    document.addEventListener("mousemove", this.drag);
    document.addEventListener("mouseup", this.stopDrag);
    document.addEventListener("touchmove", this.drag, { passive: false });
    document.addEventListener("touchend", this.stopDrag);
  };

  incrementMaxZIndex = (element) => {
    if (!element.id) {
      return;
    }
    // Remove active focus from all windows, then mark this one active
    document.querySelectorAll('.window-active').forEach(w => w.classList.remove('window-active'));
    element.classList.add('window-active');
    this.bottomApps.forEach((bottomApp) => {
      if (bottomApp.classList.contains("taskbar-selected")) {
        bottomApp.classList.remove("taskbar-selected");
      }
    });
    const currentBottomApp = document.getElementById(element.id + "_bottom");
    if (currentBottomApp) currentBottomApp.classList.add("taskbar-selected");
    element.style.zIndex = this.maxZIndex + 1;
    ++this.maxZIndex;
  };

  drag = (event) => {
    if (event.cancelable) event.preventDefault();
    if (this.element.dataset.maximized) {
      return;
    }
    const isTouch = event.touches !== undefined;
    const rawX = isTouch ? event.touches[0].clientX : event.clientX;
    const rawY = isTouch ? event.touches[0].clientY : event.clientY;
    let mouseY = rawY;
    if (rawY < 0) {
      mouseY = 0;
    } else if (rawY > window.innerHeight - 50) {
      mouseY = window.innerHeight - 50;
    }
    let mouseX = rawX;
    if (rawX < 0) {
      mouseX = 0;
    } else if (rawX > window.innerWidth) {
      mouseX = window.innerWidth;
    }
    const deltaX = mouseX - this.initialMouseX;
    const deltaY = mouseY - this.initialMouseY;
    this.element.style.left = this.initialWindowX + deltaX + "px";
    this.element.style.top = this.initialWindowY + deltaY + "px";
  };
  stopDrag = () => {
    if (this.ds.stopped) {
      this.ds.start();
    }
    document.removeEventListener("mousemove", this.drag);
    document.removeEventListener("mouseup", this.stopDrag);
    document.removeEventListener("touchmove", this.drag);
    document.removeEventListener("touchend", this.stopDrag);
  };

  activateTitleBarEvents = () => {
    this.titleBar.forEach((title_bar) => {
      title_bar.addEventListener("mousedown", this.startDrag);
      title_bar.addEventListener("touchstart", this.startDrag, { passive: true });
      title_bar.addEventListener("dblclick", () => {
        const minimizeButton = title_bar.querySelector(".minimize");
        this.resizeWindow(title_bar.parentElement, minimizeButton);
      });
    });
  };

  getCurrentDateTime = () => {
    const now = new Date(Date.now() + (window._clockOffset || 0));
    const options = {
      year: "numeric",
      month: "numeric",
      day: "numeric",
    };
    const altOptions = { weekday: "short", month: "short", day: "numeric" };
    const formattedDate = window._clockAltFormat
      ? now.toLocaleDateString(undefined, altOptions)
      : now.toLocaleDateString(undefined, options);
    const hours = now.getHours().toString().padStart(2, "0");
    const minutes = now.getMinutes().toString().padStart(2, "0");
    const seconds = now.getSeconds().toString().padStart(2, "0");
    return { formattedDate, hours, minutes, seconds };
  };

  activateDateTimeUpdates = () => {
    const { formattedDate, hours, minutes, seconds } = this.getCurrentDateTime();
    this.currentDate.textContent = formattedDate;
    this.hoursMinutes.textContent = window._clockAltFormat
      ? `${hours}:${minutes}:${seconds}`
      : `${hours}:${minutes}`;
  };

  activateAppEvents = () => {
    this.apps.forEach((app) => {
      app.addEventListener("dblclick", () => this.openApp(app));
      app.addEventListener("touchend", (e) => {
        e.preventDefault();
        this.openApp(app);
      });
    });
  };
  deactivateEvents() {}

  openApp = (app) => {
    const appName = app.id.replace("_app", "");
    if (appName == "resume") {
      const iframe = document.getElementById("resume-iframe");
      const link = document.getElementById("resume-download");
      if (iframe) { iframe.src = Resume; }
      if (link) { link.href = Resume; link.setAttribute("download", "Resume_Jay.pdf"); }
      this.openWindow("resume");
    } else if (appName == "linkedin") {
      window.open("https://www.linkedin.com/in/jay-patel-556b8b241/", "_blank");
    } else if (appName == "github") {
      window.open("https://github.com/tisjayy", "_blank");
    } else {
      this.openWindow(appName);
    }
  };

  activateBottomAppEvents = () => {
    this.bottomApps.forEach((bottomApp) => {
      bottomApp.addEventListener("click", () => {
        const appName = bottomApp.id.replace("_bottom", "");
        const currentWindow = document.getElementById(appName);
        if (currentWindow && currentWindow.style.display !== "none") {
          // minimize: hide window but keep taskbar button lit
          currentWindow.style.display = "none";
          bottomApp.classList.remove("taskbar-selected");
        } else if (currentWindow && bottomApp.classList.contains("taskbar-opened")) {
          // restore from minimized state
          currentWindow.style.display = "block";
          this.incrementMaxZIndex(currentWindow);
        } else {
          this.openWindow(appName);
        }
      });
    });
  };

  openWindow = (appName) => {
    // Limit taskbar to 5 simultaneous open apps
    const _tb = document.getElementById(appName + "_bottom");
    if (_tb && !_tb.classList.contains("taskbar-opened")) {
      const openCount = document.querySelectorAll(".taskbar-app.taskbar-opened").length;
      if (openCount >= 5) {
        this.showRetroError(
          "Too Many Windows",
          "You cannot have more than 5 windows open at once.\n\nPlease close a window before opening another."
        );
        return;
      }
    }
    const currentWindow = document.getElementById(appName);
    currentWindow.style.display = "block";
    try {
      const visited = JSON.parse(localStorage.getItem('jay_visited') || '{}');
      visited[appName] = true;
      localStorage.setItem('jay_visited', JSON.stringify(visited));
      window.dispatchEvent(new CustomEvent('jay-app-opened', { detail: { app: appName } }));
    } catch(e) {}
    if (appName === "resume") {
      const iframe = document.getElementById("resume-iframe");
      const link = document.getElementById("resume-download");
      if (iframe && (!iframe.src || iframe.src === "about:blank" || iframe.src === location.href)) { iframe.src = Resume; }
      if (link) { link.href = Resume; link.setAttribute("download", "Resume_Jay.pdf"); }
    }
    // If rubiks iframe hasn't been loaded yet by idle callback, load it now on demand
    if (appName === "rubiks-cube") {
      var rubiks = document.getElementById("rubiks-iframe");
      if (rubiks && !rubiks.src) { rubiks.src = rubiks.dataset.idleSrc; }
    }
    const iframeToLoad = currentWindow.querySelector("iframe[data-src]");
    if (iframeToLoad) iframeToLoad.src = iframeToLoad.dataset.src;
    const bottomApp = document.getElementById(appName + "_bottom");
    bottomApp.classList.add("taskbar-opened");
    this.incrementMaxZIndex(currentWindow);
    currentWindow.addEventListener("mousedown", (event) => {
      if (!this.ds.stopped) {
        this.ds.stop();
      }
      if (
        !event.srcElement.classList.contains("close") &&
        !event.srcElement.classList.contains("restore")
      ) {
        this.incrementMaxZIndex(currentWindow);
      }
    });
  };
  activateMinimizeButtons = () => {
    this.minimizeButtons.forEach((minimizeButton) => {
      minimizeButton.addEventListener("click", () => {
        const currentWindow =
          minimizeButton.parentElement.parentElement.parentElement;
        currentWindow.style.display = "none";
        const bottomApp = document.getElementById(currentWindow.id + "_bottom");
        if (bottomApp && bottomApp.classList.contains("taskbar-selected")) {
          bottomApp.classList.remove("taskbar-selected");
        }
      });
    });
  };
  activateCloseButtons = () => {
    this.closeButtons.forEach((closeButton) => {
      closeButton.addEventListener("click", () => {
        const currentWindow =
          closeButton.parentElement.parentElement.parentElement;

        const timelines = currentWindow.querySelectorAll(".timeline");
        const companyLogos = currentWindow.querySelectorAll(".company-logo");
        currentWindow.removeAttribute("style");
        const content =
          currentWindow.id == "contact"
            ? currentWindow.querySelector(".content-light")
            : currentWindow.querySelector(".content");
        if (currentWindow.id == "experience") {
          timelines.forEach((timeline) => {
            timeline.style.display = "none";
          });

          companyLogos.forEach((companyLogo) => {
            if (companyLogo.classList.contains("company-logo-selected")) {
              companyLogo.classList.remove("company-logo-selected");
            }
          });
        }
        content?.scrollTo(0, 0);
        const iframeToReset = currentWindow.querySelector("iframe[data-src]");
        if (iframeToReset) iframeToReset.src = "about:blank";
        if (currentWindow.id === "music-player" && currentWindow._stopMusic) {
          currentWindow._stopMusic();
        }
        currentWindow.style.display = "none";
        const bottomApp = document.getElementById(currentWindow.id + "_bottom");
        if (bottomApp.classList.contains("taskbar-opened")) {
          bottomApp.classList.remove("taskbar-opened");
        }
        if (bottomApp.classList.contains("taskbar-selected")) {
          bottomApp.classList.remove("taskbar-selected");
        }
      });
    });
  };
  activateRestoreButtons = () => {
    this.restoreButtons.forEach((restore) => {
      restore.addEventListener("click", () => {
        const currentWindow = restore.parentElement.parentElement.parentElement;
        this.resizeWindow(currentWindow, restore);
      });
    });
  };

  resizeWindow = (window, minimizeButton) => {
    this.incrementMaxZIndex(window);
    if (!window.dataset.maximized) {
      minimizeButton.classList.add("minimize-full");
      this.maximizeWindow(window);
    } else {
      if (minimizeButton.classList.contains("minimize-full")) {
        minimizeButton.classList.remove("minimize-full");
      }
      this.minimizeWindow(window);
    }
  };

  maximizeWindow = (currentWindow) => {
    // save current inline styles so we can restore them later
    currentWindow.dataset.prevWidth     = currentWindow.style.width;
    currentWindow.dataset.prevHeight    = currentWindow.style.height;
    currentWindow.dataset.prevTop       = currentWindow.style.top;
    currentWindow.dataset.prevLeft      = currentWindow.style.left;
    currentWindow.dataset.prevTransform = currentWindow.style.transform;
    currentWindow.dataset.maximized     = '1';

    const taskbarH = 34; // px — must match footer height
    currentWindow.style.transform = 'none';
    currentWindow.style.left      = '0';
    currentWindow.style.top       = '0';
    currentWindow.style.width     = 'calc(100vw / 1.1)';
    currentWindow.style.height    = 'calc((100vh - ' + taskbarH + 'px) / 1.1)';
  };

  showRetroError(title, message) {
    const existing = document.getElementById("desktop-retro-error");
    if (existing) existing.remove();

    const dialog = document.createElement("div");
    dialog.id = "desktop-retro-error";
    dialog.style.cssText = [
      "position:fixed","top:50%","left:50%",
      "transform:translate(-50%,-50%)",
      "z-index:999999","width:320px",
      "background:#d4d0c8",
      "border:2px solid #fff",
      "outline:2px solid #808080",
      "font-family:Tahoma,sans-serif",
      "font-size:12px","box-shadow:4px 4px 8px rgba(0,0,0,0.6)",
    ].join(";");

    dialog.innerHTML = `
      <div style="background:linear-gradient(to right,#0a246a,#3a6ea5);color:#fff;padding:3px 6px;display:flex;align-items:center;justify-content:space-between;">
        <span style="display:flex;align-items:center;gap:6px;"><img src="/imgs/icons/error.png" onerror="this.style.display='none'" style="width:16px;height:16px;"> ${title}</span>
        <button onclick="document.getElementById('desktop-retro-error').remove()" style="background:#d4d0c8;border:1px solid #808080;color:#000;width:16px;height:14px;font-size:10px;cursor:pointer;padding:0;line-height:1;">&#x2715;</button>
      </div>
      <div style="padding:16px;display:flex;gap:12px;align-items:flex-start;">
        <span style="font-size:32px;line-height:1;">&#x26A0;</span>
        <p style="margin:0;line-height:1.5;white-space:pre-line;">${message}</p>
      </div>
      <div style="text-align:center;padding:0 16px 12px;">
        <button onclick="document.getElementById('desktop-retro-error').remove()" style="min-width:75px;padding:3px 12px;background:#d4d0c8;border-top:1px solid #fff;border-left:1px solid #fff;border-right:1px solid #808080;border-bottom:1px solid #808080;cursor:pointer;font-family:Tahoma,sans-serif;font-size:12px;">OK</button>
      </div>
    `;

    document.body.appendChild(dialog);
  }

  minimizeWindow = (currentWindow) => {
    if (currentWindow.dataset.maximized) {
      // restore from maximized state
      delete currentWindow.dataset.maximized;
      currentWindow.style.width     = currentWindow.dataset.prevWidth     || '';
      currentWindow.style.height    = currentWindow.dataset.prevHeight    || '';
      currentWindow.style.top       = currentWindow.dataset.prevTop       || '';
      currentWindow.style.left      = currentWindow.dataset.prevLeft      || '';
      currentWindow.style.transform = currentWindow.dataset.prevTransform || '';
    } else {
      const currentWindowID = currentWindow.id;
      let offset = 80;
      if (currentWindowID == "credits" || currentWindowID == "about-me") {
        offset = 60;
      }
      currentWindow.style.width = offset + "vw";
      currentWindow.style.height = offset + "vh";
    }
  };
}

// Silently pre-load the Rubik's Cube iframe during browser idle time
// so it's already initialized the first time the user opens it.
window.addEventListener('load', function () {
  var loadRubiks = function () {
    var iframe = document.getElementById('rubiks-iframe');
    if (iframe && !iframe.src) {
      iframe.src = iframe.dataset.idleSrc;
    }
  };
  if ('requestIdleCallback' in window) {
    requestIdleCallback(loadRubiks, { timeout: 3000 });
  } else {
    setTimeout(loadRubiks, 2000);
  }
});

export default Desktop;
