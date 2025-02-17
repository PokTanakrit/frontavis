import { useEffect, useState } from "react";
import { usePorcupine } from "@picovoice/porcupine-react";
import HelloAvisKeywordModel from "../Hello_avis"; // เปลี่ยนชื่อเป็น HelloAvisKeywordModel ตามไฟล์ใหม่
import modelParams from "../porcupine_params";    // อิมพอร์ตไฟล์ porcupine_params ที่แปลงเป็น base64 แล้ว

export default function VoiceWidget() {

    const [keywordDetections, setKeywordDetections] = useState([]);

    const {
        keywordDetection,
        isLoaded,
        isListening,
        error,
        init,
        start,
        stop,
        release
    } = usePorcupine();

    const initEngine = async () => {
        await init(
        "pGO4BAYiyE5xOsIbk5ybzw38zI1oTal4m5vqHkR+XGfEiNwpL8IGLw==", // ใส่ API key ของคุณตรงนี้
        {
            "base64": HelloAvisKeywordModel,  // ใช้ HelloAvisKeywordModel แทน heyJarvisKeywordModel
            "label": "Hello Avis"              // เปลี่ยน label เป็น Hello Avis ตาม wakeword ของคุณ
        },
        { base64: modelParams }             // ใช้ modelParams จากไฟล์ที่แปลงแล้ว
        );
        start();
    };

    useEffect(() => {
        if (keywordDetection !== null) {
        setKeywordDetections((oldVal) => [...oldVal, keywordDetection.label]);
        }
    }, [keywordDetection]);

    return (
        <div className="voice-widget">
        <h3>
            <label>
            <button className="init-button" onClick={() => initEngine()}>
                Start
            </button>
            </label>
        </h3>
        {keywordDetections.length > 0 && (
            <ul>
            {keywordDetections.map((label, index) => (
                <li key={index}>{label}</li>
            ))}
            </ul>
        )}
        </div>
    );
    }
