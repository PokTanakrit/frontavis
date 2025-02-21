import { useEffect, useState, useCallback, useRef } from "react";
import { usePorcupine } from "@picovoice/porcupine-react";
import HelloAvisKeywordModel from "./Hello_avis";
import ThankYouAvisKeywordModel from "./Thank-you-Avis";
import modelParams from "./porcupine_params";
import TalkingScreen from "./components/TalkingScreen";
import SliderPage from "./components/Newsfeed";
import "./App.css";
import { CgCloseO } from "react-icons/cg";

export default function VoiceWidget() {
    const [showTalkingScreen, setShowTalkingScreen] = useState(false);
    const [isListeningActive, setIsListeningActive] = useState(false);
    const [showStopIcon, setShowStopIcon] = useState(false); // ✅ แก้ปัญหา setShowStopIcon is not defined
    const silenceTimeoutRef = useRef(null); // ✅ ใช้ useRef ได้แล้ว

    const {
        keywordDetection,
        isLoaded,
        init,
        start,
        stop
    } = usePorcupine();

    // ✅ ฟังก์ชันเริ่มบันทึกเสียง (แก้ไข startRecording is not defined)
    const startRecording = () => {
        console.log("🎙 เริ่มบันทึกเสียง...");
        setShowStopIcon(true);
        // ใส่โค้ดเริ่มบันทึกเสียงที่ต้องการ
    };

    const startListening = () => {
        console.log("🔊 เริ่มฟังเสียง...");
        start();
    };

    const stopListening = () => {
        console.log("🔇 หยุดฟังเสียง...");
        stop();
        setShowTalkingScreen(false);
        setIsListeningActive(false);
        setShowStopIcon(false);
    };

    const resetSilenceTimer = () => {
        if (silenceTimeoutRef.current) clearTimeout(silenceTimeoutRef.current);
        silenceTimeoutRef.current = setTimeout(() => {
            console.log("⏳ ไม่มีเสียง 20 วินาที -> ปิด TalkingScreen");
            stopListening();
        }, 20000);
    };

    const playVoice = async (text) => {
        try {
            const response = await fetch("http://localhost:4000/playvoice", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text }),
            });

            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
            setShowStopIcon(false);
            startRecording(); // ✅ แก้ปัญหา startRecording is not defined
        } catch (error) {
            console.error("Error playing voice:", error);
        }
    };

    useEffect(() => {
        const initEngine = async () => {
            if (!isLoaded) {
                await init(
                    "pGO4BAYiyE5xOsIbk5ybzw38zI1oTal4m5vqHkR+XGfEiNwpL8IGLw==",
                    [
                        { base64: HelloAvisKeywordModel, label: "Hello Avis" },
                        { base64: ThankYouAvisKeywordModel, label: "Thank you Avis" }
                    ],
                    { base64: modelParams }
                );
                startListening();
            }
        };
        initEngine();
    }, [init, startListening, isLoaded]);

    useEffect(() => {
        if (keywordDetection !== null) {
            console.log("🔍 ตรวจจับได้:", keywordDetection.label);

            if (keywordDetection.label === "Hello Avis" && !showTalkingScreen) {
                console.log("✅ พูด Hello Avis -> เปิด TalkingScreen");
                setShowTalkingScreen(true);
                setIsListeningActive(true);
                playVoice("สวัสดีครับ มีอะไรให้ช่วยครับ");
                resetSilenceTimer();
            } 
            else if (keywordDetection.label === "Thank you Avis" && showTalkingScreen) {
                console.log("❌ พูด Thank you Avis -> ปิด TalkingScreen");
                stopListening();
            }
        }
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
                    <TalkingScreen resetSilenceTimer={resetSilenceTimer} />
                    <div style={{ position: "absolute", bottom: "50px", display: "flex", justifyContent: "flex-end", width: "100%", paddingRight: "20px" }}>
                        <CgCloseO onClick={stopListening} size={120} style={{ cursor: "pointer", color: "red" }} />
                    </div>
                </div>
            )}
        </div>
    );
}
