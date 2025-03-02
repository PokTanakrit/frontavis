import asyncio
import websockets
import pyttsx3
import json
import aiohttp
import threading
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS

# ตั้งค่าระบบ logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")

app = Flask(__name__)
CORS(app)

def play_text(text, callback_url):
    logging.info(f"🔊 Playing text: {text}")
    engine = pyttsx3.init()
    TH_voice_id = "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Speech\\Voices\\Tokens\\TTS_THAI"
    engine.setProperty('voice', TH_voice_id)
    engine.setProperty('rate', 120)
    engine.setProperty('volume', 1)
    
    engine.say(text)
    engine.runAndWait()

    logging.info("✅ เสียงพูดจบแล้ว!")

    # 🔥 แจ้งเตือนไปยัง Frontend เมื่อเสียงพูดจบ
    if callback_url:
        try:
            import requests
            requests.post(callback_url, json={"status": "done"})
            logging.info("📢 แจ้งเตือน Frontend สำเร็จ")
        except Exception as e:
            logging.error(f"❌ แจ้งเตือน Frontend ล้มเหลว: {e}")

# WebSocket Wakeword
async def WebSocket_wakeword(websocket, _):
    try:
        logging.info("🌐 Wakeword WebSocket connected.")
        message = await websocket.recv()
        data = json.loads(message)
        command = data.get("command", "")
        logging.info(f"🔎 Received command: {command}")

        # กำหนดข้อความตอบกลับ
        if command == "hello_avis":
            response_text = "สวัสดีครับ มีอะไรให้ช่วยครับ"
        elif command == "thank_you_avis":
            response_text = "ขอบคุณที่ใช้บริการ Avis ครับ"
        else:
            response_text = "ขอโทษครับ ฉันไม่เข้าใจ"

        logging.info(f"💬 Responding with: {response_text}")

        # ✅ รอให้เสียงเล่นเสร็จก่อนส่ง Response ไปยัง WebSocket
        await play_text(response_text, callback_url=None)

        # 🔥 ส่ง response กลับไปยัง WebSocket
        await websocket.send(json.dumps({"response": response_text, "status": "done"}))

    except Exception as e:
        logging.error(f"⚠️ Error in Wakeword WebSocket: {e}")



# # WebSocket Speech-to-Text (Port 8001)
# async def handle_connection_WebSocket_speech_to_text(websocket, _):
#     try:
#         logging.info("🎤 Speech-to-Text WebSocket connected.")
#         async for message in websocket:
#             if isinstance(message, bytes):
#                 logging.info("🎤 Received audio data")
#                 text = await send_audio_to_gowajee(message)
#                 logging.info(f"📝 Transcribed text: {text}")
#                 await websocket.send(json.dumps({"text": text}))
#             else:
#                 logging.warning(f"⚠️ Received non-audio data: {message}")

#     except websockets.exceptions.ConnectionClosed:
#         logging.warning("❌ Speech-to-Text WebSocket closed.")
#     except Exception as e:
#         logging.error(f"⚠️ Error in Speech-to-Text WebSocket: {e}")

# async def send_audio_to_gowajee(audio_data):
#     url = "https://api.gowajee.ai/v1/speech-to-text/pulse/transcribe"
#     headers = {
#         "x-api-key": "gwj_live_68e8664be460418ab4eee60e7eb60ca0_hbooe"
#     }
    
#     # กำหนดค่าไฟล์เสียงด้วย content_type โดยตรง
#     files = {
#         'audioData': ('audio.wav', audio_data, 'audio/wav')
#     }
    
#     async with aiohttp.ClientSession() as session:
#         async with session.post(url, headers=headers, data=files) as response:
#             response_text = await response.text()
#             logging.info(f"🔍 API Response: {response_text}")
#             if response.status == 200:
#                 response_json = await response.json()
#                 transcript = response_json.get("transcript", "")
#                 return transcript
#             else:
#                 logging.error(f"❌ Error {response.status}: {response_text}")
#                 return ""



# async def send_text_to_llm(text):
#     url = "http://localhost:5000/call_llm"
#     async with aiohttp.ClientSession() as session:
#         async with session.post(url, json={"text": text}) as resp:
#             result = await resp.json()
#             response_text = result.get("response", "ขอโทษครับ ฉันไม่เข้าใจ")
#             logging.info(f"🤖 LLM Response: {response_text}")
#             return response_text

# async def process_speech():
#     async with websockets.connect("ws://localhost:8001") as websocket:
#         logging.info("🎤 Connected to Speech-to-Text WebSocket")
#         await websocket.send(json.dumps({"action": "start_recording"}))
#         response = await websocket.recv()
#         text = json.loads(response).get("text", "")
#         if text:
#             llm_response = await send_text_to_llm(text)
#             logging.info(f"🤖 LLM Response: {llm_response}")
#             await asyncio.to_thread(play_text, llm_response)

async def start_websocket_servers():
    logging.info("🚀 Starting WebSocket servers...")
    wakeword_server = await websockets.serve(WebSocket_wakeword, "localhost", 8000)
    # speech_to_text_server = await websockets.serve(handle_connection_WebSocket_speech_to_text, "localhost", 8001)
    # await asyncio.gather(wakeword_server.wait_closed(), speech_to_text_server.wait_closed())
    await asyncio.gather(wakeword_server.wait_closed())

@app.route("/playvoice", methods=["POST"])
def playvoice():
    data = request.get_json()
    text = data.get("text", "")
    callback_url = data.get("callback_url", "")

    if text:
        threading.Thread(target=play_text, args=(text, callback_url)).start()
        logging.info(f"กำลัง return กลับ")
        return jsonify({"status": "success", "message": "กำลังเล่นเสียง...", "text": text}), 200
    else:
        return jsonify({"status": "error", "message": "No text provided."}), 400

def run_flask():
    logging.info("🚀 Starting Flask server...")
    app.run(host="0.0.0.0", port=4000, threaded=True)

def run_websockets():
    asyncio.run(start_websocket_servers())

if __name__ == '__main__':
    # Start Flask in a separate thread
    flask_thread = threading.Thread(target=run_flask)
    flask_thread.start()

    # Start WebSocket server in the main thread
    run_websockets()
