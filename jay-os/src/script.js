import "./style.css";
import Desktop from "./desktop";
import Chatbot from "./chatbot";
import MusicPlayer from "./music-player";

const desktop = new Desktop();
window._desktop = desktop;
desktop.activateEvents();
desktop.openWindow("readme");

const chatbot = new Chatbot();
chatbot.activateEvents();

const musicPlayer = new MusicPlayer();
musicPlayer.activateEvents();
