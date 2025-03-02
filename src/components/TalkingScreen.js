import React, { useState, useEffect, useRef } from "react";
import "./TalkingScreen.css";
import { HiOutlineMicrophone } from "react-icons/hi2";
import { FaRegStopCircle, FaRegPlayCircle } from "react-icons/fa";
//-----------------------------------นำเข้า wakeword-----------------------------------------
import { usePorcupine } from "@picovoice/porcupine-react";
import HelloAvisKeywordModel from "../Hello_avis";
import ThankYouAvisKeywordModel from "../Thank-you-Avis";
import modelParams from "../porcupine_params";

function TalkingScreen({ onSpeakingChange, onClose }) {
  const [scale, setScale] = useState(1);
  const [hasSound, setHasSound] = useState(false);
  const [showStopIcon, setShowStopIcon] = useState(true);
  const audioChunksRef = useRef([]);
  const mediaRecorderRef = useRef(null);
  const [isRecording, setIsRecording] = useState(false);
  const silenceTimeoutRef = useRef(null);
  const maxRecordTimeoutRef = useRef(null);
  const { keywordDetection, isLoaded, init, start, stop } = usePorcupine();
  const wsRef = useRef(null); // ประกาศ websocket
  const [isSpeaking, setIsSpeaking] = useState(false);
  const playTimeoutRef = useRef(null);
  const [isListening, setIsListening] = useState(true);  // เพิ่ม state isListening
  const HelloavisRef = useRef(false); // ใช้ useRef แทน useState
  const [isPaused, setIsPaused] = useState(false);  // ตัวแปรควบคุมการปิดชั่วคราว
  const [isPlayingResponse, setIsPlayingResponse] = useState(true);
  const lastKeywordRef = useRef(null); // ใช้ ref เก็บค่า keyword ล่าสุด




// ----------------------------------- WebSocket ------------------------------------------
const connectWebSocket = (url = "ws://localhost:8000") => {
  if (isPaused || (wsRef.current && wsRef.current.readyState === WebSocket.OPEN)) return;

  console.log("🔌 กำลังเชื่อมต่อ WebSocket...");
  wsRef.current = new WebSocket(url);

  wsRef.current.onopen = () => {
    console.log("✅ WebSocket connected, re-enabling wake word...");
    // setIsListening(true);  // ✅ เปิด wake word ใหม่
    // start();
};
  
  wsRef.current.onclose = () => {
      console.log("🔄 ปิด WebSocket แล้ว.");
  };

  wsRef.current.onerror = (error) => console.error("⚠️ WebSocket error:", error);
};

// 📤 ส่งข้อความผ่าน WebSocket อย่างปลอดภัย
const safeSendMessage = (message) => {
  if (!wsRef.current) {
      console.warn("🚫 WebSocket ยังไม่ได้ถูกสร้าง");
      return;
  }

  if (wsRef.current.readyState === WebSocket.OPEN) {
      console.log("📨 กำลังส่งข้อความผ่าน WebSocket:", message);
      wsRef.current.send(JSON.stringify(message));
  } else if (wsRef.current.readyState === WebSocket.CONNECTING) {
      console.warn("⏳ WebSocket ยังเชื่อมต่อไม่เสร็จ รอ 500ms แล้วลองใหม่...");
      setTimeout(() => safeSendMessage(message), 500);
  } else {
      console.error("❌ WebSocket ไม่ได้อยู่ในสถานะที่สามารถส่งข้อความได้:", wsRef.current.readyState);
  }
};

useEffect(() => {
  connectWebSocket(); // ✅ เชื่อมต่อ WebSocket ตอนเริ่มต้น
  return () => wsRef.current?.close(); // ❌ ปิด WebSocket เมื่อ component unmount
}, []);



useEffect(() => {
  if (isPlayingResponse === false) { // ✅ ตรวจสอบค่าให้ชัดเจน
    console.log("✅ เปิดระบบฟัง wake word ใหม่...");
    setIsPaused(false); // เปิด wake word อีกครั้ง
    setIsListening(true);
    start(); // เปิดระบบฟัง wake word
  }
}, [isPlayingResponse]);

useEffect(() => {
  if (!isLoaded) {
    init("pGO4BAYiyE5xOsIbk5ybzw38zI1oTal4m5vqHkR+XGfEiNwpL8IGLw==", [
      { base64: HelloAvisKeywordModel, label: "Hello Avis" },
      { base64: ThankYouAvisKeywordModel, label: "Thank you Avis" },
    ], { base64: modelParams }).then(() => start());
  }
}, [isLoaded, init, start]);

useEffect(() => { 
  if (!keywordDetection || !isListening) return;

  // ✅ ป้องกันการ trigger ซ้ำ
  if (lastKeywordRef.current === keywordDetection.label) return;

  console.log("🔍 Detected keyword:", keywordDetection.label);
  lastKeywordRef.current = keywordDetection.label; // บันทึกค่าล่าสุด
  console.log(lastKeywordRef.current)

  if (lastKeywordRef.current === "Hello Avis") {
    safeSendMessage({ command: "hello_avis" });
    HelloavisRef.current = true;
    setIsPaused(true);
    wsRef.current?.close();
    setTimeout(startRecording, 3500);
  } else if (lastKeywordRef.current === "Thank you Avis") {
    safeSendMessage({ command: "thank_you_avis" });
    console.log("👋 Goodbye!");
    lastKeywordRef.current = null;
    wsRef.current?.close();
    stop(); // หยุด wake word
    stopRecording()
    if (typeof onClose === "function") {
      onClose();  // ✅ เรียกฟังก์ชันปิด
    }
  }
}, [keywordDetection, isListening]);


const handleAudioProcessing = (stream) => {
  if (!HelloavisRef.current) return; // ❌ ถ้าไม่ได้ยิน wake word ไม่ทำงาน

  console.log("🎙️ ตั้งค่าการบันทึกเสียง...");
  const recorder = new MediaRecorder(stream);

  recorder.ondataavailable = (e) => {
      if (e.data.size > 0 && HelloavisRef.current) {
          console.log("🔹 บันทึกเสียง chunk...");
          audioChunksRef.current.push(e.data);
      }
  };

  recorder.onstop = async () => {
      console.log("🛑 หยุดบันทึกเสียง");
      if (audioChunksRef.current.length === 0) return;

      console.log("🎵 กำลังสร้างไฟล์เสียง...");
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });

      console.log("📨 ส่งเสียงไป API...");
      sendAudioToAPI(audioBlob);

      // 🔄 **รีเซ็ตค่าทั้งหมด**
      audioChunksRef.current = [];
  };

  return recorder;
};

// 🎤 เริ่มบันทึกเสียง
const startRecording = async () => {
  if (mediaRecorderRef.current?.state === "recording") return;
  setShowStopIcon(false);
  console.log("🎙️ เริ่มบันทึกเสียง...");
  

  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  mediaRecorderRef.current = handleAudioProcessing(stream);
  mediaRecorderRef.current.start();
  setIsRecording(true);
  maxRecordTimeoutRef.current = setTimeout(stopRecording, 10000);
};

// 🛑 หยุดบันทึกเสียง
const stopRecording = () => {
  if (!isRecording || !mediaRecorderRef.current) return;
  console.log("🛑 หยุดบันทึกเสียง");
  mediaRecorderRef.current.stop();
  setIsRecording(false);
  setShowStopIcon(true);
};

// 📨 ส่งเสียงไป API
const sendAudioToAPI = async (audioBlob) => {
  try {
      console.log("📨 กำลังส่งเสียงไป API...");
      const formData = new FormData();
      formData.append("audioData", audioBlob, "audio.webm");

      const response = await fetch("https://api.gowajee.ai/v1/speech-to-text/pulse/transcribe", {
          method: "POST",
          headers: { "x-api-key": "gwj_live_68e8664be460418ab4eee60e7eb60ca0_hbooe" },
          body: formData,
      });

      if (response.ok) {
          const result = await response.json();
          const text = result.output.results.map((item) => item.transcript).join(" ");
          console.log("📝 ข้อความที่ถอดเสียงได้:", text);
          sendTextToLocalServer(text);
      }
  } catch (error) {
      console.error("❌ Error processing audio:", error);
  }
};

// 📩 ส่งข้อความไป Local Server
const sendTextToLocalServer = async (text) => {
  try {
      console.log("📩 ส่งข้อความไป Local Server:", text);

      const response = await fetch("http://localhost:5000/call_llm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
      });

      if (response.ok) {
          const result = await response.json();
          console.log("🔊 กำลังเล่นเสียงที่ได้รับจาก AI...");
          await playVoice(result.responses);
      }else{
        const text = "ไม่มีข้อมูลที่เกี่ยงข้องครับ"
        console.log("🔊 กำลังเล่นเสียงที่ได้รับจาก AI...");
        await playVoice(text);
      }
  } catch (error) {
      console.error("❌ Error sending text:", error);
  }
};

const playVoice = async (text) => {
  try {
    if (!HelloavisRef.current) return;

    stopRecording();
    setIsSpeaking(true);
    // setIsListening(false);
    stop();
    setIsPaused(true);
    lastKeywordRef.current = null; // 🔄 เคลียร์ค่า keyword ที่เคยตรวจจับก่อนหน้านี้
    console.log(lastKeywordRef.current)

    console.log("🔊 กำลังเล่นเสียง:", text);

    const speechSynthesisUtterance = new SpeechSynthesisUtterance(text);
    
    // ปรับค่าต่างๆ
    speechSynthesisUtterance.rate = 0.8;    // ความเร็ว
    speechSynthesisUtterance.volume = 0.9;  // ระดับเสียง
    speechSynthesisUtterance.pitch = 1.0;   // โทนเสียง

    // เลือกเสียงที่รองรับภาษาไทย
    const voices = speechSynthesis.getVoices();
    speechSynthesisUtterance.voice = voices.find(voice => voice.name.includes("Google ไทย"));

    speechSynthesis.speak(speechSynthesisUtterance);

    speechSynthesisUtterance.onend = () => {
      console.log("🔄 เชื่อม websocket ใหม่...");
      connectWebSocket();
      console.log("🔄 เปิด wake word ใหม่...");
      setIsPlayingResponse(false)
      setIsPaused(false);
      HelloavisRef.current = false;

      setTimeout(() => {
        // setIsListening(true);
        start();
      }, 1500);  // ✅ รอ 2 วินาทีก่อนเปิด wake word ใหม่
    };

  } catch (error) {
    console.error("❌ Error playing voice:", error);
  }
};




  
  //-------------------------------------------
    //-----------------------------------โค้ด process เสียง-------------------------------------
    useEffect(() => {
      const setupAudio = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const analyser = audioContext.createAnalyser();
          const microphone = audioContext.createMediaStreamSource(stream);
          const processor = audioContext.createScriptProcessor(256, 1, 1);
  
          analyser.smoothingTimeConstant = 0.8;
          analyser.fftSize = 1024;
  
          microphone.connect(analyser);
          analyser.connect(processor);
          processor.connect(audioContext.destination);
  
          processor.onaudioprocess = function () {
            const array = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(array);
            const average = array.reduce((sum, value) => sum + value, 0) / array.length;
            const volume = Math.min(average / 100, 1);
  
            if (isRecording) {
              setScale(1 + volume);
              setHasSound(volume > 0.1);
  
              if (volume > 0.1) {
                clearTimeout(silenceTimeoutRef.current);
                silenceTimeoutRef.current = setTimeout(() => {
                  stopRecording();
                }, 3000);
              }
            }
          };
  
          return stream;
        } catch (error) {
          console.error("เกิดข้อผิดพลาดในการตั้งค่าเสียง:", error);
        }
      };
  
      setupAudio();
    }, [isRecording]);


  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div
        className="circle"
        style={{
          transform: `scale(${isRecording ? scale : 1})`,
          backgroundColor: isRecording ? (hasSound ? "white" : "gray") : "gray",
        }}
      >
        <HiOutlineMicrophone size={120} color="black" />
      </div>

      {/* Recording / Stop icons */}
      <div style={{ position: "absolute", bottom: "50px", display: "flex", justifyContent: "flex-end", width: "100%", paddingRight: "355px" }}>
        {showStopIcon ? (
          <FaRegStopCircle size={120} style={{ cursor: "pointer", color: "gray" }} />
        ) : (
          <FaRegPlayCircle 
            onClick={startRecording} 
            size={120} 
            style={{ cursor: "pointer", color: "green" }} 
          />
        )}
      </div>
    </div>
  );
}
export default TalkingScreen;