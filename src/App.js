import React, { useState, useEffect } from "react";
import "./App.css";

function App() {
  const [scale, setScale] = useState(1);
  const [hasSound, setHasSound] = useState(false); // State สำหรับเก็บสถานะว่ามีเสียงหรือไม่

  useEffect(() => {
    // Check if the browser supports the Web Audio API and get user media
    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices
        .getUserMedia({ audio: true })
        .then((stream) => {
          const audioContext = new (window.AudioContext ||
            window.webkitAudioContext)();
          const analyser = audioContext.createAnalyser();
          const microphone = audioContext.createMediaStreamSource(stream);
          const processor = audioContext.createScriptProcessor(256, 1, 1);

          analyser.smoothingTimeConstant = 0.8;
          analyser.fftSize = 1024;

          microphone.connect(analyser);
          analyser.connect(processor);
          processor.connect(audioContext.destination);

          processor.onaudioprocess = function (event) {
            const array = new Uint8Array(analyser.frequencyBinCount);
            analyser.getByteFrequencyData(array);
            let values = 0;

            const length = array.length;
            for (let i = 0; i < length; i++) {
              values += array[i];
            }

            const average = values / length;
            const volume = Math.min(average / 100, 1); // Normalize volume between 0 and 1

            // Set the scale based on the volume
            setScale(1 + volume);

            // ถ้า volume มากกว่า 0.1 ให้เปลี่ยน state ว่ามีเสียง
            setHasSound(volume > 0.1);
          };
        })
        .catch((err) => {
          console.error("The following error occurred: " + err);
        });
    }
  }, []);

  // Set the background color based on whether there's sound
  const backgroundColor = hasSound ? "white" : "gray"; // เปลี่ยนสีเป็นขาวถ้ามีเสียง

  return (
    <div className="App">
      <div
        className="circle"
        style={{
          transform: `scale(${scale})`,
          backgroundColor: backgroundColor, // เปลี่ยนสีตามมีเสียงหรือไม่มีเสียง
        }}
      />
    </div>
  );
}

export default App;
