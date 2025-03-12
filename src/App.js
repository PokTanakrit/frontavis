import React, { useState, useEffect } from "react";
import TalkingScreen from "./components/TalkingScreen";
import SliderPage from "./components/Newsfeed";
import { CgCloseO } from "react-icons/cg";
import "./App.css";
import { usePorcupine } from "@picovoice/porcupine-react";
import HelloAvisKeywordModel from "./Hello_avis";
import ThankYouAvisKeywordModel from "./Thank-you-Avis";
import modelParams from "./porcupine_params";

export default function APP() {
    const [showTalkingScreen, setShowTalkingScreen] = useState(false);
    const { keywordDetection, isLoaded, init, start, stop } = usePorcupine();

    useEffect(() => {
        if (!isLoaded) {
            init("pGO4BAYiyE5xOsIbk5ybzw38zI1oTal4m5vqHkR+XGfEiNwpL8IGLw==", [
                { base64: HelloAvisKeywordModel, label: "Hello Avis" },
                { base64: ThankYouAvisKeywordModel, label: "Thank you Avis" },
            ], { base64: modelParams }).then(() => start());
        }
    }, [isLoaded, init, start]);

    // ✅ ตรวจจับ wake word และเปิด/ปิด TalkingScreen อัตโนมัติ
    useEffect(() => {
        if (!keywordDetection) return;

        console.log("🔍 ตรวจจับ Wake Word:", keywordDetection.label);

        if (keywordDetection.label === "Hello Avis") {
            setShowTalkingScreen(true);
        } 
        // else if (keywordDetection.label === "Thank you Avis") {
        //     setShowTalkingScreen(false);
        // }
    }, [keywordDetection]);

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
                        onClose={() => setShowTalkingScreen(false)}  
                        keywordDetection={keywordDetection} // ✅ ส่งค่า keywordDetection ไป
                    />
                    <div style={{ position: "absolute", bottom: "50px", display: "flex", justifyContent: "flex-end", width: "100%", paddingRight: "20px" }}>
                        <CgCloseO onClick={() => setShowTalkingScreen(false)} size={120} style={{ cursor: "pointer", color: "red" }} />
                    </div>
                </div>
            )}
        </div>
    );
}
