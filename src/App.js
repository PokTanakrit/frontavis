import React, { useState } from 'react';
import NewsFeed from './components/NewsFeed';
import TalkingScreen from './components/TalkingScreen';
import StopTalkingScreen from './components/StopTalkingScreen';
import EndTalkingScreen from './components/EndTalkingScreen';
import ChatHistory from './components/ChatHistory';
import './App.css';  // Import CSS

function App() {
  const [screen, setScreen] = useState('news'); // สถานะเริ่มต้นเป็น 'news'
  const [showTalkingScreen, setShowTalkingScreen] = useState(false); // สถานะสำหรับเปิด TalkingScreen ขนาดเล็ก

  const handleMicClick = () => {
    setShowTalkingScreen(true); // เปิด TalkingScreen ขนาดเล็ก
  };

  return (
    <div className="App">
      {screen === 'news' && <NewsFeed onMicClick={handleMicClick} />}
      {screen === 'talking' && <TalkingScreen onStopClick={() => setScreen('stopTalking')} />}
      {screen === 'stopTalking' && <StopTalkingScreen onEndClick={() => setScreen('endTalking')} />}
      {screen === 'endTalking' && (
        <EndTalkingScreen
          onHistoryClick={() => setScreen('history')}
          onCloseClick={() => setScreen('news')}
        />
      )}
      {screen === 'history' && <ChatHistory onBackClick={() => setScreen('news')} />}

      {/* ปุ่มกลมๆ เล็ก สีฟ้า */}
      <button className="floating-button" onClick={handleMicClick}>
        แชทด้วยเสียง
      </button>

      {/* แสดง TalkingScreen ขนาดเล็ก */}
      {showTalkingScreen && (
        <div className="small-talking-screen">
          <TalkingScreen />
          <button onClick={() => setShowTalkingScreen(false)}>ปิด</button> {/* ปุ่มปิด TalkingScreen */}
        </div>
      )}
    </div>
  );
}

export default App;
