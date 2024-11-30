import { useEffect, useState } from "react";
import { usePorcupine } from "@picovoice/porcupine-react";
import HelloAvisKeywordModel from "./Hello_avis";  // นำเข้า Hello_avis จาก src/
import modelParams from "./porcupine_params";     // นำเข้า porcupine_params จาก src/
import TalkingScreen from "./components/TalkingScreen";  // นำเข้า TalkingScreen จาก components/
import NewsFeed from "./components/NewsFeed";  // นำเข้า NewsFeed

export default function VoiceWidget() {
    const [keywordDetections, setKeywordDetections] = useState([]);
    const [showTalkingScreen, setShowTalkingScreen] = useState(false);  // สถานะเพื่อแสดงหน้าจอ TalkingScreen

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

    // เริ่มต้นการทำงานของ Porcupine โดยอัตโนมัติเมื่อคอมโพเนนต์โหลด
    const initEngine = async () => {
        await init(
            "pGO4BAYiyE5xOsIbk5ybzw38zI1oTal4m5vqHkR+XGfEiNwpL8IGLw==", // ใส่ API key ของคุณตรงนี้
            {
                "base64": HelloAvisKeywordModel,  // ใช้ HelloAvisKeywordModel แทน hello_avis
                "label": "Hello Avis"             // เปลี่ยน label เป็น Hello Avis ตาม wakeword ของคุณ
            },
            { base64: modelParams }             // ใช้ modelParams จากไฟล์ที่แปลงแล้ว
        );
        start();  // เริ่มต้นการฟังเสียง
    };

    // เริ่มต้นการฟังเสียงทันทีเมื่อคอมโพเนนต์ถูกโหลด
    useEffect(() => {
        initEngine();  // เรียกฟังก์ชันเพื่อเริ่มต้นการฟังเสียง
    }, []);  // ใช้ empty dependency array เพื่อให้ทำงานเพียงครั้งเดียวเมื่อคอมโพเนนต์ถูกโหลด

    // ตรวจจับคำสำคัญและแสดงหน้าจอ TalkingScreen เมื่อพบ wakeword
    useEffect(() => {
        if (keywordDetection !== null) {
            setKeywordDetections((oldVal) => [...oldVal, keywordDetection.label]);  // เมื่อตรวจจับคำสำคัญ เพิ่มลงใน list
            if (keywordDetection.label === "Hello Avis") {
                setShowTalkingScreen(true);  // ถ้าพบคำว่า "Hello Avis" ให้แสดงหน้าจอ TalkingScreen
            }
        }
    }, [keywordDetection]);

    return (
        <div className="voice-widget">
            {/* ถ้าพบคำสำคัญ "Hello Avis" จะแสดงหน้าจอ TalkingScreen */}
            {showTalkingScreen ? (
                <div className="small-talking-screen">
                    <TalkingScreen />
                    <button onClick={() => setShowTalkingScreen(false)}>ปิด</button> {/* ปุ่มปิด TalkingScreen */}
                </div>
            ) : (
                <NewsFeed />
            )}
        </div>
    );
}
