class VolumeProcessor extends AudioWorkletProcessor {
    constructor() {
      super();
      this._volume = 0;
    }
  
    process(inputs) {
      const input = inputs[0];
      if (input.length > 0) {
        const channelData = input[0];
        let sum = 0;
  
        for (let i = 0; i < channelData.length; i++) {
          sum += channelData[i] * channelData[i];
        }
        const rms = Math.sqrt(sum / channelData.length);
        this._volume = rms;
      }
  
      // ส่งข้อมูล volume กลับไปยัง main thread
      this.port.postMessage({ volume: this._volume });
      
      return true;
    }
  }
  
  registerProcessor('volume-processor', VolumeProcessor);
  