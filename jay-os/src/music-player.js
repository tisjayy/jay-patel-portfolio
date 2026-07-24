// ── Playlist ─────────────────────────────────────────────────────────────────
// Drop MP3 files into  jay-os/static/music/  then add entries here:
// { title: "Song Name", artist: "Artist Name", src: "/music/filename.mp3" }
const PLAYLIST = [
  { title: "Champagne Supernova (Live)", artist: "Oasis", src: "/music/Oasis_-_Champagne_Supenova_Live_(mp3.pm).mp3" },
  { title: "Last Nite", artist: "The Strokes", src: "/music/The_Strokes_-_Last_Nite_(mp3.pm).mp3" },
  { title: "Weird Fishes / Arpeggi", artist: "Radiohead", src: "/music/Radiohead_-_Weird_Fishes_Arpeggi_(mp3.pm).mp3" },
];

class MusicPlayer {
  constructor() {
    this.audio = new Audio();
    this.audio.crossOrigin = "anonymous";
    this.playlist = PLAYLIST;
    this.trackIndex = 0;
    this.isPlaying = false;
    this.audioCtx = null;
    this.analyser = null;
    this.animFrame = null;
    this.t = 0; // idle animation time
  }

  activateEvents() {
    this.playBtn    = document.getElementById("mp-play");
    this.stopBtn    = document.getElementById("mp-stop");
    this.prevBtn    = document.getElementById("mp-prev");
    this.nextBtn    = document.getElementById("mp-next");
    this.seekBar    = document.getElementById("mp-seek");
    this.volumeBar  = document.getElementById("mp-volume");
    this.titleEl    = document.getElementById("mp-title-scroll");
    this.timeEl     = document.getElementById("mp-time");
    this.eqCanvas   = document.getElementById("mp-eq");
    this.playlistEl = document.getElementById("mp-playlist");

    this.audio.volume = parseFloat(this.volumeBar.value);

    this.playBtn.addEventListener("click",  () => this.togglePlay());
    this.stopBtn.addEventListener("click",  () => this.stop());
    this.prevBtn.addEventListener("click",  () => this.prevTrack());
    this.nextBtn.addEventListener("click",  () => this.nextTrack());

    this.seekBar.addEventListener("input", () => {
      if (this.audio.duration) {
        this.audio.currentTime = (this.seekBar.value / 100) * this.audio.duration;
      }
    });

    this.volumeBar.addEventListener("input", () => {
      this.audio.volume = parseFloat(this.volumeBar.value);
    });

    this.audio.addEventListener("timeupdate", () => this.updateTime());
    this.audio.addEventListener("ended",      () => this.nextTrack());

    this.renderPlaylist();
    if (this.playlist.length > 0) {
      this.loadTrack(0);
    }

    // Expose stop on the DOM element so desktop.js can call it on close
    const win = document.getElementById("music-player");
    if (win) win._stopMusic = () => this.stop();

    this.startEQAnimation();
  }

  // ── AudioContext (created lazily on first play to satisfy autoplay policy) ──
  setupAudioContext() {
    if (this.audioCtx) {
      if (this.audioCtx.state === "suspended") this.audioCtx.resume();
      return;
    }
    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = this.audioCtx.createMediaElementSource(this.audio);
    this.analyser = this.audioCtx.createAnalyser();
    this.analyser.fftSize = 64;
    source.connect(this.analyser);
    this.analyser.connect(this.audioCtx.destination);
  }

  // ── EQ canvas animation ────────────────────────────────────────────────────
  startEQAnimation() {
    const canvas = this.eqCanvas;
    const ctx    = canvas.getContext("2d");
    const BAR_COUNT = 16;

    const draw = () => {
      this.animFrame = requestAnimationFrame(draw);
      ctx.fillStyle = "#000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barW = Math.floor(canvas.width / BAR_COUNT);

      if (this.analyser) {
        // Real frequency data
        const dataArr = new Uint8Array(this.analyser.frequencyBinCount);
        this.analyser.getByteFrequencyData(dataArr);
        for (let i = 0; i < BAR_COUNT; i++) {
          const h = Math.max(2, (dataArr[i * 2] / 255) * canvas.height);
          const g = ctx.createLinearGradient(0, canvas.height - h, 0, canvas.height);
          g.addColorStop(0,   "#00ff00");
          g.addColorStop(0.5, "#00cc00");
          g.addColorStop(1,   "#005500");
          ctx.fillStyle = g;
          ctx.fillRect(i * barW, canvas.height - h, barW - 2, h);
        }
      } else {
        // Idle: gentle sine-wave bounce
        this.t += 0.05;
        for (let i = 0; i < BAR_COUNT; i++) {
          const h = Math.max(2, (0.12 + 0.08 * Math.sin(this.t + i * 0.4)) * canvas.height);
          ctx.fillStyle = "#006600";
          ctx.fillRect(i * barW, canvas.height - h, barW - 2, h);
        }
      }
    };
    draw();
  }

  // ── Track management ───────────────────────────────────────────────────────
  loadTrack(index) {
    this.trackIndex = index;
    const track = this.playlist[index];
    if (!track) return;
    this.audio.src = track.src;
    this.titleEl.textContent = `${track.artist}  —  ${track.title}`;
    this.seekBar.value = 0;
    this.timeEl.textContent = "0:00";
    this.updatePlaylistHighlight();
  }

  togglePlay() {
    if (!this.playlist.length) return;
    if (this.audio.paused) {
      this.setupAudioContext();
      this.audio.play().catch(() => {});
      this.isPlaying = true;
      this.playBtn.textContent = "⏸";
    } else {
      this.audio.pause();
      this.isPlaying = false;
      this.playBtn.textContent = "▶";
    }
  }

  stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.isPlaying = false;
    this.playBtn.textContent = "▶";
    this.seekBar.value = 0;
    this.timeEl.textContent = "0:00";
  }

  prevTrack() {
    if (!this.playlist.length) return;
    this.loadTrack((this.trackIndex - 1 + this.playlist.length) % this.playlist.length);
    if (this.isPlaying) { this.setupAudioContext(); this.audio.play().catch(() => {}); }
  }

  nextTrack() {
    if (!this.playlist.length) return;
    this.loadTrack((this.trackIndex + 1) % this.playlist.length);
    if (this.isPlaying) { this.setupAudioContext(); this.audio.play().catch(() => {}); }
  }

  updateTime() {
    const t = this.audio.currentTime;
    const d = this.audio.duration || 0;
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60).toString().padStart(2, "0");
    this.timeEl.textContent = `${m}:${s}`;
    if (d) this.seekBar.value = (t / d) * 100;
  }

  // ── Playlist UI ────────────────────────────────────────────────────────────
  renderPlaylist() {
    this.playlistEl.innerHTML = "";
    if (!this.playlist.length) {
      this.playlistEl.innerHTML = '<div class="mp-playlist-empty">No tracks loaded</div>';
      return;
    }
    this.playlist.forEach((track, i) => {
      const item = document.createElement("div");
      item.className = "mp-playlist-item";
      item.textContent = `${i + 1}. ${track.artist} — ${track.title}`;
      item.addEventListener("click", () => {
        this.loadTrack(i);
        this.setupAudioContext();
        this.audio.play().catch(() => {});
        this.isPlaying = true;
        this.playBtn.textContent = "⏸";
      });
      this.playlistEl.appendChild(item);
    });
    this.updatePlaylistHighlight();
  }

  updatePlaylistHighlight() {
    this.playlistEl.querySelectorAll(".mp-playlist-item").forEach((item, i) => {
      item.classList.toggle("mp-playlist-active", i === this.trackIndex);
    });
  }
}

export default MusicPlayer;
