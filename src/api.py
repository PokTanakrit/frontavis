from flask import Flask, request, jsonify
import pyttsx3
import threading
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

def play_text(text):
    engine = pyttsx3.init()
    TH_voice_id = "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Speech\\Voices\\Tokens\\TTS_THAI"
    engine.setProperty('voice', TH_voice_id)
    engine.setProperty('rate', 120)
    engine.setProperty('volume', 1)
    engine.say(text)
    engine.runAndWait()

@app.route('/playvoice', methods=['POST'])
def play_voice():
    try:
        data = request.get_json(force=True)  # force=True for non-Content-Type JSON issues
        print("Raw data received:", request.data)
        print("Parsed data:", data)

        text = data.get('text')
        if text:
            threading.Thread(target=play_text, args=(text,)).start()
            return jsonify({"message": "Text received and is being spoken."}), 200
        else:
            return jsonify({"error": "No text provided."}), 400
    except Exception as e:
        print("Error:", e)
        return jsonify({"error": "Invalid JSON or request format."}), 400
    

@app.route('/searchkeyword', methods=['POST'])
def local_server():
    return jsonify({"generated_response": "วันศุกร์ต้องส่งแล้ว"}), 200  # ✅ ใช้ dict ที่ถูกต้อง
    

if __name__ == '__main__':
    app.run(port=4000)
