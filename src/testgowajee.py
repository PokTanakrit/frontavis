import requests

url = "https://api.gowajee.ai/v1/speech-to-text/pulse/transcribe"
headers = {
    "x-api-key": "gwj_live_d3cdffcd659240b591f960155eedf0d5_xpva6"
}

# อ่านไฟล์เป็น binary data
with open("./Recording.wav", "rb") as audio_file:
    audio_data = audio_file.read()

# ส่งข้อมูล audio data ไปยัง API
response = requests.post(url, headers=headers, files={"audioData": ("Recording.wav", audio_data, "audio/wav")})

# แสดงผลลัพธ์แบบละเอียด
print(f"Status Code: {response.status_code}")
print(f"Response Headers: {response.headers}")
print("Response Content:", response.content)
