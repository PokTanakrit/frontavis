import pyttsx3
engine = pyttsx3.init()

TH_voice_id = "HKEY_LOCAL_MACHINE\SOFTWARE\Microsoft\Speech\Voices\Tokens\TTS_THAI"

engine.setProperty('volume', 0.9)  # Volume 0-1
engine.setProperty('rate', 120)  #148

engine.setProperty('voice', TH_voice_id)
engine.say('อยากเป็นโปรแกรมเมอร์ แนะนำว่าควรเรียน Computer Science (คอมพิวเตอร์ศาสตร์) เพราะนอกจากจะได้เรียนเกี่ยวกับการเขียนโปรแกรมแล้ว ยังได้เรียนทักษะที่จำเป็นในการทำงานในวงการโปรแกรมเมอร์ เช่น การออกแบบระบบ, การแก้ไขปัญหา, และการสร้างซอฟต์แวร์ที่มีประสิทธิภาพ แต่ถ้าอยากเรียนโปรแกรมเมอร์เฉพาะทาง อาจจะเรียน Software Engineering (การ engineer ซอฟต์แวร์) ก็ได้นะครับ')

engine.runAndWait()