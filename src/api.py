import asyncio
import websockets
import pyttsx3
import json
from flask import Flask, request, jsonify 
from flask_cors import CORS
import threading

app = Flask(__name__)

CORS(app)
# ฟังก์ชันพูดข้อความ (รันใน background)
def play_text(text):
    engine = pyttsx3.init()
    TH_voice_id = "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Speech\\Voices\\Tokens\\TTS_THAI"
    engine.setProperty('voice', TH_voice_id)
    engine.setProperty('rate', 120)
    engine.setProperty('volume', 1)
    engine.say(text)
    engine.runAndWait()

# WebSocket: ฟังก์ชันจัดการคำสั่งที่ได้รับ
async def process_message(websocket, message):
    try:
        data = json.loads(message)
        command = data.get("command", "")

        if command == "hello_avis":
            response_text = "สวัสดีครับ มีอะไรให้ช่วยครับ"
            asyncio.create_task(asyncio.to_thread(play_text, response_text))
            await websocket.send(json.dumps({"response": response_text}))

        elif command == "thank_you_avis":
            response_text = "ขอบคุณที่ใช้บริการ Avis ครับ"
            asyncio.create_task(asyncio.to_thread(play_text, response_text))
            await websocket.send(json.dumps({"response": response_text}))

        else:
            await websocket.send(json.dumps({"error": "Unknown command."}))

    except json.JSONDecodeError:
        await websocket.send(json.dumps({"error": "Invalid JSON format."}))
    except Exception as e:
        await websocket.send(json.dumps({"error": str(e)}))

# WebSocket: ฟังก์ชันจัดการการเชื่อมต่อ
async def handle_connection(websocket, path):
    print("🔌 Client connected.")
    try:
        async for message in websocket:
            print(f"📩 Received message: {message}")
            await process_message(websocket, message)
    except websockets.exceptions.ConnectionClosed:
        print("❌ Client disconnected.")
    except Exception as e:
        print(f"⚠️ WebSocket error: {e}")

# สร้าง WebSocket Server
async def start_websocket_server():
    server = await websockets.serve(handle_connection, "localhost", 8000)
    print("🚀 WebSocket server is running on ws://localhost:8000")
    await server.wait_closed()

# Flask API endpoint สำหรับเล่นเสียง
@app.route("/playvoice", methods=["POST"])
def playvoice():
    data = request.get_json()
    text = data.get("text", "")
    if text:
        threading.Thread(target=play_text, args=(text,)).start()
        return jsonify({"status": "success", "message": "Text is being spoken.", "text": text}), 200
    else:
        return jsonify({"status": "error", "message": "No text provided."}), 400

# ฟังก์ชันรัน Flask ใน thread แยก
def run_flask():
    app.run(host="0.0.0.0", port=4000)

if __name__ == '__main__':
    # รัน Flask server ใน thread แยก
    flask_thread = threading.Thread(target=run_flask)
    flask_thread.start()
    print("🚀 flask_thread  is running on ws://localhost:4000")

    # รัน WebSocket server ใน asyncio event loop
    asyncio.run(start_websocket_server())
    print("🚀 WebSocket server is running on ws://localhost:8000")


