import React, { useState, useEffect, useRef } from "react";
import "./TalkingScreen.css";

function TalkingScreen() {
  const [scale, setScale] = useState(1);
  const [hasSound, setHasSound] = useState(false);
  const audioChunksRef = useRef([]); // Use ref for audio chunks
  const [mediaRecorder, setMediaRecorder] = useState(null);
  const [status, setStatus] = useState("");
  const [isRecording, setIsRecording] = useState(false);

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
          const average = array.reduce((sum, value) => sum + value) / array.length;
          const volume = Math.min(average / 100, 1); // Normalize volume between 0 and 1

          if (isRecording) {
            setScale(1 + volume);
            setHasSound(volume > 0.1);
          }
        };

        return stream; // Return stream for use in MediaRecorder
      } catch (error) {
        console.error("เกิดข้อผิดพลาดในการตั้งค่าเสียง:", error);
      }
    };

    setupAudio();
  }, [isRecording]);

  const handleAudioProcessing = (stream) => {
    const recorder = new MediaRecorder(stream);
    console.log("MediaRecorder initialized:", recorder);
    setMediaRecorder(recorder);

    recorder.ondataavailable = (e) => {
      console.log("Data available:", e.data.size);
      if (e.data.size > 0) {
        audioChunksRef.current.push(e.data); // Push data into ref
      }
    };

    recorder.onstop = async () => {
      console.log("Size of audio chunks:", audioChunksRef.current.length); // Log the number of audio chunks
      if (audioChunksRef.current.length === 0) {
        console.error("ไม่มีข้อมูลเสียงที่จะส่งไปยัง API");
        setStatus("ไม่มีข้อมูลเสียงที่จะส่งไป");
        return;
      }

      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
      const transcripts = await sendAudioToAPI(audioBlob);
      console.log("Transcripts:", transcripts);
      audioChunksRef.current = []; // Clear data after sending
      setIsRecording(false);
      setScale(1);
    };

    return recorder;
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = handleAudioProcessing(stream);
      recorder.start();
      console.log("Recording started");
      setIsRecording(true);
      setStatus("กำลังบันทึกเสียง...");
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการเริ่มบันทึกเสียง:", error);
      setStatus("เกิดข้อผิดพลาดในการเริ่มบันทึกเสียง");
    }
  };

  const sendAudioToAPI = async (audioBlob) => {
    try {
      const formData = new FormData();
      formData.append("audioData", audioBlob, "audio.webm");

      const headers = {
        "x-api-key": "gwj_live_68e8664be460418ab4eee60e7eb60ca0_hbooe",
      };

      const response = await fetch("https://api.gowajee.ai/v1/speech-to-text/pulse/transcribe", {
        method: "POST",
        headers: headers,
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        const transcripts = result.output.results.map((item) => item.transcript);
        const fullText = transcripts.join(" ");
        console.log("ข้อความที่ถอดเสียง:", fullText);
        setStatus("ส่งเสียงสำเร็จ");
        await sendTextToLocalServer(fullText);
        return fullText;
      } else {
        const errorText = await response.text();
        console.error("เกิดข้อผิดพลาดในการส่งเสียงไปที่ API:", response.status, response.statusText, errorText);
        setStatus(`เกิดข้อผิดพลาดในการส่งเสียง: ${response.statusText}`);
      }
    } catch (error) {
      console.error("เกิดข้อผิดพลาดในการประมวลผลไฟล์เสียง:", error);
      setStatus("เกิดข้อผิดพลาดในการประมวลผลเสียง");
    }
  };

  const sendTextToLocalServer = async (text) => {
    try {
        const body = JSON.stringify({ text: text });

        const response = await fetch("http://localhost:3000/searchindex3", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: body,
        });

        if (response.ok) {
            const result = await response.json();
            console.log("ข้อความถูกส่งไปยังเซิร์ฟเวอร์ท้องถิ่นแล้ว:", result);

            // Using the generated response for TTS
            const textToSpeak = result.responses.generated_response; // Correct path to generated_response
            console.log("Text to speak:", textToSpeak);
            await playVoice(textToSpeak); // Calls playVoice function with the desired text


            setStatus("ข้อความถูกส่งไปยังเซิร์ฟเวอร์ท้องถิ่นแล้ว");
        } else {
            console.error("เกิดข้อผิดพลาดในการส่งข้อความไปที่เซิร์ฟเวอร์ท้องถิ่น:", response.status, response.statusText);
            setStatus("เกิดข้อผิดพลาดในการส่งข้อความไปที่เซิร์ฟเวอร์ท้องถิ่น");
        }
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการส่งข้อความ:", error);
        setStatus("เกิดข้อผิดพลาดในการส่งข้อความ: " + error.message);
    }
};

// ฟังก์ชันเล่นเสียงที่เรียก API TTS
const playVoice = async (text) => {
    try {
        const body = JSON.stringify({ text: text });

        const response = await fetch("http://localhost:4000/playvoice", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: body,
        });

        if (response.ok) {
            const result = await response.json();
            console.log("เสียงเล่นเรียบร้อยแล้ว:", result);
        } else {
            console.error("เกิดข้อผิดพลาดในการเล่นเสียง:", response.status, response.statusText);
        }
    } catch (error) {
        console.error("เกิดข้อผิดพลาดในการเล่นเสียง:", error);
    }
}

  const backgroundColor = isRecording ? (hasSound ? "white" : "gray") : "gray";
  const circleScale = isRecording ? scale : 1; // ขนาดของวงกลมขยับเมื่อบันทึกเสียง

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div
        className="circle"
        style={{
          transform: `scale(${circleScale})`,
          backgroundColor: backgroundColor,
          width: '200px',
          height: '200px',
          borderRadius: '50%',
        }}
      />
      <div style={{ marginTop: '80px' }}>
        <button onClick={startRecording} disabled={isRecording}>
          เริ่มบันทึก
        </button>
        <button
          onClick={() => {
            if (mediaRecorder) {
              mediaRecorder.stop();
              setStatus("หยุดการบันทึกเสียงแล้ว");
              setScale(1);
              setHasSound(false);
            }
          }}
          disabled={!isRecording}
        >
          หยุดบันทึก
        </button>
      </div>
      <div>{status}</div>
    </div>
  );
}

export default TalkingScreen;
