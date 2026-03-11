import "./style.css";
import Desktop from "./desktop";
import Chatbot from "./chatbot";
import MusicPlayer from "./music-player";

const desktop = new Desktop();
desktop.activateEvents();

const chatbot = new Chatbot();
chatbot.activateEvents();

const musicPlayer = new MusicPlayer();
musicPlayer.activateEvents();
