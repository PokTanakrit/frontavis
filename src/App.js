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
    const [showStopIcon, setShowStopIcon] = useState(false);
    const [volumeLevel, setVolumeLevel] = useState(0);
    const silenceTimeoutRef = useRef(null);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const dataArrayRef = useRef(null);

    const { keywordDetection, isLoaded, init, start, stop } = usePorcupine();

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
                analyser.getByteFrequencyData(dataArrayRef.current); // 🔊 อ่านข้อมูลเสียง
                const avgVolume = dataArrayRef.current.reduce((a, b) => a + b, 0) / dataArrayRef.current.length; // 🎚️ คำนวณค่าเฉลี่ย
                setVolumeLevel(avgVolume); // 📢 อัปเดต state สำหรับ UI
            
                // ✅ เงื่อนไขใหม่: ถ้าค่าดังไม่ถึง 95 -> เคลียร์ค่าเสียง
                if (avgVolume < 95) {
                    dataArrayRef.current.fill(0); // 🔥 เคลียร์ทุกค่าในอาร์เรย์
                    console.log("🧹 avgVolume ต่ำกว่า 95 -> เคลียร์ค่าเสียงแล้ว");
                }
            
                requestAnimationFrame(checkVolume); // 🔄 ตรวจจับทุกเฟรม
            };
            

            checkVolume();
        } catch (error) {
            console.error("❌ ไม่สามารถเข้าถึงไมค์:", error);
        }
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
        } catch (error) {
            console.error("❌ Error playing voice:", error);
        }
    };

    const startListening = () => {
        console.log("🔊 เริ่มฟังเสียง...");
        start();
        startVolumeDetection();
    };

    const stopListening = () => {
        console.log("🔇 หยุดฟังเสียง...");
        stop();
        setShowTalkingScreen(false);
        setIsListeningActive(false);
        setShowStopIcon(false);
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
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

    useEffect(() => {
        if (keywordDetection) {
            console.log("🔍 ตรวจจับได้:", keywordDetection.label);

            if (keywordDetection.label === "Hello Avis" && !showTalkingScreen) {
                console.log("✅ พูด Hello Avis -> เปิด TalkingScreen");
                setShowTalkingScreen(true);
                setIsListeningActive(true);
                playVoice("สวัสดีครับ มีอะไรให้ช่วยครับ");
                resetSilenceTimer();
            } else if (keywordDetection.label === "Thank you Avis" && showTalkingScreen) {
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
                    <div
                        style={{ position: "absolute", bottom: "50px", display: "flex", justifyContent: "flex-end", width: "100%", paddingRight: "20px" }}
                    >
                        <CgCloseO onClick={stopListening} size={120} style={{ cursor: "pointer", color: "red" }} />
                    </div>
                </div>
            )}
        </div>
    );
}
