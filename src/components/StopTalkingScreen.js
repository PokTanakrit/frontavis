import React from 'react';

function StopTalkingScreen({ onEndClick }) {
  return (
    <div className="stop-talking-screen">
      <div className="mic-icon">🎤</div>
      <button className="end-button" onClick={onEndClick}>
        End
      </button>
    </div>
  );
}

export default StopTalkingScreen;
