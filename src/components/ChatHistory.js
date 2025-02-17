import React from 'react';

function ChatHistory({ onBackClick }) {
  return (
    <div className="chat-history">
      <div className="user-message">User: สวัสดีครับ</div>
      <div className="system-message">System: สวัสดีค่ะ ยินดีที่ได้รู้จัก!</div>
      <button className="back-button" onClick={onBackClick}>กลับ</button>
    </div>
  );
}

export default ChatHistory;
