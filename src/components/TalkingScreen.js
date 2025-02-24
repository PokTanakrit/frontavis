import React, { useState, useEffect, useRef } from "react";
import "./TalkingScreen.css";
import { HiOutlineMicrophone } from "react-icons/hi2";
import { FaRegStopCircle, FaRegPlayCircle } from "react-icons/fa";

function TalkingScreen({ onSpeakingChange, onClose }) {
  const [scale, setScale] = useState(1);
  const [hasSound, setHasSound] = useState(false);
  const [showStopIcon, setShowStopIcon] = useState(true);
  const [status, setStatus] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioChunksRef = useRef([]);
  const mediaRecorderRef = useRef(null);
  const silenceTimeoutRef = useRef(null);
  const maxRecordTimeoutRef = useRef(null);
  const playTimeoutRef = useRef(null);

  // ตั้งค่า Audio Processor เพื่อตรวจจับระดับเสียง
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

          // ทำงานเฉพาะเมื่อบันทึกเสียงและไม่ได้อยู่ในช่วงพูด
          if (isRecording && !isSpeaking) {
            setScale(1 + volume);
            setHasSound(volume > 0.1);
            if (volume > 0.1) {
              clearTimeout(silenceTimeoutRef.current);
              silenceTimeoutRef.current = setTimeout(() => {
                // หากไม่มีเสียงเข้ามาเป็นเวลา 3 วินาที ให้หยุดบันทึกเสียง
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
  }, [isRecording, isSpeaking]);

  // เมื่อ showStopIcon เปลี่ยนให้เริ่มบันทึกเสียง (หาก UI เปิดอยู่)
  useEffect(() => {
    if (showStopIcon) {
      const timeoutId = setTimeout(() => {
        setShowStopIcon(false);
        startRecording();
      }, 3000);
      return () => clearTimeout(timeoutId);
    }
  }, [showStopIcon]);

  const handleAudioProcessing = (stream) => {
    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunksRef.current.push(e.data);
      }
    };

    recorder.onstop = async () => {
      if (audioChunksRef.current.length === 0) {
        console.error("ไม่มีข้อมูลเสียง");
        setStatus("ไม่มีข้อมูลเสียง");
        return;
      }
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      await sendAudioToAPI(audioBlob);
      audioChunksRef.current = [];
      setIsRecording(false);
      setScale(1);
    };

    return recorder;
  };

  const startRecording = async () => {
    // หากกำลังพูดอยู่ (isSpeaking) ไม่เริ่มบันทึกใหม่
    if (isSpeaking) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = handleAudioProcessing(stream);
      recorder.start();
      setIsRecording(true);
      setStatus("กำลังบันทึกเสียง...");
      maxRecordTimeoutRef.current = setTimeout(() => {
        stopRecording();
      }, 10000);
    } catch (error) {
      console.error("เกิดข้อผิดพลาด:", error);
      setStatus("เกิดข้อผิดพลาดในการบันทึกเสียง");
    }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      clearTimeout(maxRecordTimeoutRef.current);
      clearTimeout(silenceTimeoutRef.current);
      setStatus("หยุดบันทึกเสียงแล้ว");
      setShowStopIcon(true);
      setIsRecording(false);
    }
  };

  const sendTextToLocalServer = async (text) => {
    try {
      const response = await fetch("http://localhost:5000/call_llm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (response.ok) {
        const result = await response.json();
        console.log("ข้อความที่ได้จาก LLM:", result.responses);
        const textToSpeak = result.responses;
        // เรียก playVoice แล้วรอจน API แจ้งว่าพูดจบ
        await playVoice(textToSpeak);
        setStatus("ข้อความถูกส่งไปยังเซิร์ฟเวอร์ท้องถิ่นแล้ว");
      } else {
        console.error("Error sending text:", response.statusText);
        setStatus("เกิดข้อผิดพลาดในการส่งข้อความไปที่เซิร์ฟเวอร์ท้องถิ่น");
      }
    } catch (error) {
      console.error("Error:", error);
      setStatus("เกิดข้อผิดพลาดในการส่งข้อความ: " + error.message);
    }
  };

  const sendAudioToAPI = async (audioBlob) => {
    try {
      const formData = new FormData();
      formData.append("audioData", audioBlob, "audio.webm");
      const response = await fetch("https://api.gowajee.ai/v1/speech-to-text/pulse/transcribe", {
        method: "POST",
        headers: { "x-api-key": "gwj_live_68e8664be460418ab4eee60e7eb60ca0_hbooe" },
        body: formData,
      });
      if (response.ok) {
        const result = await response.json();
        const transcripts = result.output.results.map((item) => item.transcript);
        const fullText = transcripts.join(" ");
        console.log("ข้อความที่ถอดจากเสียง:", fullText);
        // ตรวจสอบก่อนส่งข้อมูลถ้า UI ยังเปิดอยู่ (ถ้าต้องการ)
        await sendTextToLocalServer(fullText);
      } else {
        console.error("Error:", response.statusText);
        setStatus(`เกิดข้อผิดพลาดในการส่งเสียง: ${response.statusText}`);
      }
    } catch (error) {
      console.error("Error processing audio:", error);
      setStatus("เกิดข้อผิดพลาดในการประมวลผลเสียง");
    }
  };

  const playVoice = async (text) => {
    try {
      // ก่อนเริ่มเล่นเสียง: หยุดการบันทึกเสียงและตั้ง flag isSpeaking เป็น true
      stopRecording();
      setIsSpeaking(true);
      if (onSpeakingChange) onSpeakingChange(true);
      clearTimeout(playTimeoutRef.current);

      const response = await fetch("http://localhost:4000/playvoice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const result = await response.json();
      console.log("ผลลัพธ์จาก playvoice API:", result);
      // สมมุติว่า response นี้หมายถึงเสียงพูดจบแล้ว
      setIsSpeaking(false);
      if (onSpeakingChange) onSpeakingChange(false);

      // เริ่มนับ timeoutหลังเสียงพูดจบ (ตัวอย่าง 20 วินาที)
      playTimeoutRef.current = setTimeout(() => {
        stopRecording();
        if (onClose) onClose();
      }, 20000);

      // เริ่มฟังเสียงใหม่หลังจากเสียงจบ
      startRecording();
      setShowStopIcon(false);
    } catch (error) {
      console.error("Error playing voice:", error);
      setIsSpeaking(false);
      if (onSpeakingChange) onSpeakingChange(false);
    }
  };

  const backgroundColor = isRecording ? (hasSound ? "white" : "gray") : "gray";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh" }}>
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
          <FaRegStopCircle size={120} style={{ cursor: "pointer", color: "gray" }} onClick={stopRecording} />
        ) : (
          <FaRegPlayCircle onClick={startRecording} size={120} style={{ cursor: "pointer", color: "green" }} />
        )}
      </div>
      <div>{status}</div>
    </div>
  );
}

export default TalkingScreen;
