import "./style.css";
import Desktop from "./desktop";
import Chatbot from "./chatbot";

const desktop = new Desktop();
desktop.activateEvents();

const chatbot = new Chatbot();
chatbot.activateEvents();
