from flask import Flask, request, jsonify
import pyttsx3
import threading

app = Flask(__name__)

# Initialize the TTS engine
engine = pyttsx3.init()
TH_voice_id = "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Speech\\Voices\\Tokens\\TTS_THAI"
engine.setProperty('volume', 1)  # Volume 0-1
engine.setProperty('rate', 148)  # Speed of speech
engine.setProperty('voice', TH_voice_id)

def play_text(text):
    engine.say(text)
    engine.runAndWait()  # Play the voice

@app.route('/playvoice', methods=['POST'])
def play_voice():
    data = request.get_json()
    text = data.get('text')

    if text:
        print(f"Received text: {text}")

        # Use threading to play the text without blocking
        threading.Thread(target=play_text, args=(text,)).start()

        return jsonify({"message": "Text received and is being spoken."}), 200  # Return a response immediately
    else:
        return jsonify({"error": "No text provided."}), 400  # Error response

if __name__ == '__main__':
    app.run(port=4000)
