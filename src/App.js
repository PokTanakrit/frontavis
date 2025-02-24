import { useEffect, useState, useRef } from "react";
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
    const [volumeLevel, setVolumeLevel] = useState(0);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const dataArrayRef = useRef(null);
    const wsRef = useRef(null);
    
    // flag ที่ส่งมาจาก TalkingScreen (เช่น isSpeaking) ถ้าต้องการให้ App.js รู้สถานะ
    // ในที่นี้ App.js จะไม่ใช้ flag นี้เพื่อควบคุม timeout แต่เราอาจบันทึกไว้เพื่อ debug
    const [isSpeaking, setIsSpeaking] = useState(false);

    const { keywordDetection, isLoaded, init, start, stop } = usePorcupine();

    // Initialize WebSocket สำหรับส่ง command ไป server
    const connectWebSocket = () => {
        // ตรวจสอบก่อนว่ามี connection ที่ OPEN หรือ CONNECTING อยู่หรือไม่
        if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
        console.log("WebSocket is already connected or connecting.");
        return;
        }
        wsRef.current = new WebSocket("ws://localhost:8000");
        wsRef.current.onopen = () => {
        console.log("✅ WebSocket connected");
        };
        wsRef.current.onmessage = (message) => {
        console.log("📩 Received from server:", message.data);
        // สามารถเพิ่ม logic ประมวลผล response ได้ที่นี่
        };
        wsRef.current.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
        };
        wsRef.current.onclose = () => {
        console.log("🔌 WebSocket closed. Reconnecting in 3 seconds...");
        setTimeout(connectWebSocket, 3000);
        };
    };

    useEffect(() => {
        connectWebSocket();
        return () => {
        if (wsRef.current) {
            wsRef.current.close();
        }
        };
    }, []);

    // ฟังก์ชันสำหรับเริ่มต้นฟังเสียงผ่าน Porcupine
    const startListening = () => {
        console.log("🔊 เริ่มฟังเสียง...");
        // ถ้า TalkingScreen กำลังพูด (isSpeaking) อยู่ ให้ skip startListening
        if (isSpeaking) {
        console.log("Currently speaking, skip starting listening.");
        return;
        }
        start();
        startVolumeDetection();
        setIsListeningActive(true);
    };

    // ฟังก์ชันสำหรับหยุดฟังเสียง (แค่หยุด Porcupine ใน App.js)
    const stopListening = () => {
        console.log("🔇 หยุดฟังเสียง...");
        stop();
        setShowTalkingScreen(false);
        setIsListeningActive(false);
        // รีเซ็ต AudioContext และ ref ที่เกี่ยวข้อง
        if (audioContextRef.current) {
        audioContextRef.current.close();
        audioContextRef.current = null;
        analyserRef.current = null;
        dataArrayRef.current = null;
        }
    };

    const startVolumeDetection = async () => {
        if (audioContextRef.current) return;
        try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const audioContext = new AudioContext();
        const analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        dataArrayRef.current = new Uint8Array(analyser.frequencyBinCount);
        const checkVolume = () => {
            analyser.getByteFrequencyData(dataArrayRef.current);
            const avgVolume =
            dataArrayRef.current.reduce((a, b) => a + b, 0) / dataArrayRef.current.length;
            setVolumeLevel(avgVolume);
            // ถ้า avgVolume ต่ำกว่าเกณฑ์ รีเซ็ต array (ไม่ส่งผลกับการควบคุม UI)
            if (avgVolume < 95) {
            dataArrayRef.current.fill(0);
            }
            requestAnimationFrame(checkVolume);
        };
        checkVolume();
        } catch (error) {
        console.error("❌ ไม่สามารถเข้าถึงไมค์:", error);
        }
    };

    useEffect(() => {
        const initEngine = async () => {
        if (!isLoaded) {
            await init(
            "pGO4BAYiyE5xOsIbk5ybzw38zI1oTal4m5vqHkR+XGfEiNwpL8IGLw==",
            [
                { base64: HelloAvisKeywordModel, label: "Hello Avis" },
                { base64: ThankYouAvisKeywordModel, label: "Thank you Avis" },
            ],
            { base64: modelParams }
            );
            startListening();
        }
        };
        initEngine();
    }, [init, isLoaded]);

    // ตรวจจับ wake word จาก Porcupine
    useEffect(() => {
        if (keywordDetection) {
        console.log("🔍 ตรวจจับได้:", keywordDetection.label);
        if (keywordDetection.label === "Hello Avis" && !showTalkingScreen) {
            // เปิด TalkingScreen เมื่อรับ wake word "Hello Avis"
            setShowTalkingScreen(true);
            wsRef.current.send(JSON.stringify({ command: "hello_avis" }));
        } else if (keywordDetection.label === "Thank you Avis" && showTalkingScreen) {
            wsRef.current.send(JSON.stringify({ command: "thank_you_avis" }));
            // ปิด TalkingScreen เมื่อรับ wake word "Thank you Avis"
            stopListening();
        }
        }
    }, [keywordDetection, showTalkingScreen]);

    return (
        <div className="container">
        <div className="image-section">
            <SliderPage />
        </div>
        <div className="mic-button-container">
            <div
            className="mic-button"
            onClick={() => {
                if (!showTalkingScreen) setShowTalkingScreen(true);
            }}
            >
            <img src="/images/microphone.png" alt="Microphone" className="mic-icon" />
            </div>
        </div>
        {showTalkingScreen && (
            <div className="small-talking-screen">
            <TalkingScreen 
                // หากต้องการส่ง callback ที่แจ้งสถานะ isSpeaking กลับมาให้ App.js ก็สามารถส่ง prop ได้
                onSpeakingChange={(speaking) => setIsSpeaking(speaking)}
            />
            <div
                style={{
                position: "absolute",
                bottom: "50px",
                display: "flex",
                justifyContent: "flex-end",
                width: "100%",
                paddingRight: "20px",
                }}
            >
                <CgCloseO onClick={stopListening} size={120} style={{ cursor: "pointer", color: "red" }} />
            </div>
            </div>
        )}
        </div>
    );
}
