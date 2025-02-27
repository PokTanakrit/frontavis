import asyncio
import websockets
import pyttsx3
import json
import aiohttp
import threading
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ฟังก์ชันพูดข้อความ
def play_text(text):
    engine = pyttsx3.init()
    TH_voice_id = "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Speech\\Voices\\Tokens\\TTS_THAI"
    engine.setProperty('voice', TH_voice_id)
    engine.setProperty('rate', 120)
    engine.setProperty('volume', 1)
    engine.say(text)
    engine.runAndWait()

# WebSocket Wakeword
async def WebSocket_wakeword(websocket, path):  # เพิ่ม path เพื่อรองรับ WebSocket
    try:
        message = await websocket.recv()
        data = json.loads(message)
        command = data.get("command", "")

        if command == "hello_avis":
            response_text = "สวัสดีครับ มีอะไรให้ช่วยครับ"
        elif command == "thank_you_avis":
            response_text = "ขอบคุณที่ใช้บริการ Avis ครับ"
        else:
            response_text = "ขอโทษครับ ฉันไม่เข้าใจ"

        asyncio.create_task(asyncio.to_thread(play_text, response_text))
        await websocket.send(json.dumps({"response": response_text}))
    except Exception as e:
        print(f"⚠️ Error in Wakeword WebSocket: {e}")

# ส่งเสียงไป API Gowajee เพื่อถอดเสียงเป็นข้อความ
async def send_audio_to_gowajee(audio_data):
    url = "https://api.gowajee.ai/v1/speech-to-text/pulse/transcribe"
    headers = {
        "x-api-key": "gwj_live_68e8664be460418ab4eee60e7eb60ca0_hbooe"
    }
    files = {
        'audioData': ('audio.webm', audio_data, 'audio/webm')
    }
    
    async with aiohttp.ClientSession() as session:
        async with session.post(url, headers=headers, data=files) as response:
            if response.status == 200:
                response_json = await response.json()
                return response_json.get("transcript", "")
            else:
                return f"Error: {response.status} - {await response.text()}"

# WebSocket Speech-to-Text (Port 8001)
async def handle_connection_WebSocket_speech_to_text(websocket, path):
    try:
        async for message in websocket:
            if isinstance(message, bytes):  # ตรวจสอบว่าเป็นข้อมูลเสียง
                print("🎤 Received audio data")
                text = await send_audio_to_gowajee(message)
                print(f"📝 Transcribed text: {text}")
                await websocket.send(json.dumps({"text": text}))
            else:
                print(f"⚠️ Received non-audio data: {message}")
    except websockets.exceptions.ConnectionClosed:
        print("❌ Speech-to-Text WebSocket closed.")
    except Exception as e:
        print(f"⚠️ Error in Speech-to-Text WebSocket: {e}")

async def send_text_to_llm(text):
    url = "http://localhost:5000/ask_llm"
    async with aiohttp.ClientSession() as session:
        async with session.post(url, json={"text": text}) as resp:
            result = await resp.json()
            return result.get("response", "ขอโทษครับ ฉันไม่เข้าใจ")

async def process_speech():
    async with websockets.connect("ws://localhost:8001") as websocket:
        print("🎤 Connected to Speech-to-Text WebSocket")
        await websocket.send(json.dumps({"action": "start_recording"}))
        response = await websocket.recv()
        text = json.loads(response).get("text", "")
        if text:
            llm_response = await send_text_to_llm(text)
            print(f"🤖 LLM Response: {llm_response}")
            await asyncio.to_thread(play_text, llm_response)

async def conversation_loop():
    while True:
        print("🎙️ Listening for Wakeword...")
        try:
            async with websockets.connect("ws://localhost:8000") as websocket:
                message = await websocket.recv()
                print(f"👂 Detected Wakeword: {message}")
                await process_speech()  # ถอดเสียง → ส่งไป LLM → เล่นเสียง
        except Exception as e:
            print(f"⚠️ Error connecting to Wakeword WebSocket: {e}")
            await asyncio.sleep(1)  # ถ้ามีปัญหาให้รอ 1 วินาทีแล้วลองใหม่

async def start_websocket_servers():
    wakeword_server = websockets.serve(WebSocket_wakeword, "localhost", 8000)
    speech_to_text_server = websockets.serve(handle_connection_WebSocket_speech_to_text, "localhost", 8001)
    await asyncio.gather(wakeword_server, speech_to_text_server)
    print("🚀 WebSocket servers are running on ws://localhost:8000 and ws://localhost:8001")

@app.route("/playvoice", methods=["POST"])
def playvoice():
    data = request.get_json()
    text = data.get("text", "")
    if text:
        threading.Thread(target=play_text, args=(text,)).start()
        return jsonify({"status": "success", "message": "Text is being spoken.", "text": text}), 200
    else:
        return jsonify({"status": "error", "message": "No text provided."}), 400

def run_flask():
    app.run(host="0.0.0.0", port=4000)

if __name__ == '__main__':
    flask_thread = threading.Thread(target=run_flask)
    flask_thread.start()

    asyncio.run(start_websocket_servers())  # เริ่ม WebSocket
