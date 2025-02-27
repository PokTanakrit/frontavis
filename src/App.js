import { useState } from "react";
import TalkingScreen from "./components/TalkingScreen";
import SliderPage from "./components/Newsfeed";
import { CgCloseO } from "react-icons/cg";
import "./App.css";

export default function VoiceWidget() {
    const [showTalkingScreen, setShowTalkingScreen] = useState(false);

    return (
        <div className="container">
            <div className="image-section">
                <SliderPage />
            </div>
            <div className="mic-button-container">
                <div className="mic-button" onClick={() => setShowTalkingScreen(true)}>
                    <img src="/images/microphone.png" alt="Microphone" className="mic-icon" />
                </div>
            </div>
            {showTalkingScreen && (
                <div className="small-talking-screen">
                    <TalkingScreen 
                    />
                    <div style={{ position: "absolute", bottom: "50px", display: "flex", justifyContent: "flex-end", width: "100%", paddingRight: "20px" }}>
                        <CgCloseO onClick={() => setShowTalkingScreen(false)} size={120} style={{ cursor: "pointer", color: "red" }} />
                    </div>
                </div>
            )}
        </div>
    );
}
