/**
 * High-performance browser Web Audio & MediaRecorder engine
 * Handles microphone recording, real-time chunk streaming,
 * incoming voice playback queue, frequency analysis for wave visualizers,
 * and synthetic audio notification beeps.
 */

export class AudioEngine {
  private audioCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private analyser: AnalyserNode | null = null;
  private incomingQueue: string[] = [];
  private isPlayingQueue: boolean = false;
  private gainNode: GainNode | null = null;

  constructor() {
    // AudioContext will be initialized on first user gesture
  }

  public initContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
      this.gainNode = this.audioCtx.createGain();
      this.gainNode.connect(this.audioCtx.destination);
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Start recording from microphone and stream chunks every 250ms
   */
  public async startRecording(onChunk: (base64Audio: string) => void): Promise<MediaStream> {
    this.initContext();

    if (this.mediaRecorder && this.mediaRecorder.state === 'recording') {
      return this.micStream!;
    }

    try {
      this.micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      // Connect analyser for visualizer
      if (this.audioCtx) {
        const source = this.audioCtx.createMediaStreamSource(this.micStream);
        this.analyser = this.audioCtx.createAnalyser();
        this.analyser.fftSize = 64;
        source.connect(this.analyser);
      }

      // Determine supported mimeType
      let mimeType = 'audio/webm;codecs=opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : '';
      }

      const options = mimeType ? { mimeType } : undefined;
      this.mediaRecorder = new MediaRecorder(this.micStream, options);

      this.mediaRecorder.ondataavailable = async (event) => {
        if (event.data && event.data.size > 0) {
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64 = (reader.result as string).split(',')[1];
            if (base64) {
              onChunk(base64);
            }
          };
          reader.readAsDataURL(event.data);
        }
      };

      // Slice audio in 200ms chunks for smooth walkie-talkie latency
      this.mediaRecorder.start(200);
      return this.micStream;
    } catch (err) {
      console.error('Error accessing microphone:', err);
      throw err;
    }
  }

  public stopRecording() {
    if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
      try {
        this.mediaRecorder.stop();
      } catch (e) {
        console.warn(e);
      }
    }
    if (this.micStream) {
      this.micStream.getTracks().forEach((track) => track.stop());
      this.micStream = null;
    }
    this.mediaRecorder = null;
  }

  /**
   * Play incoming base64 chunk seamlessly
   */
  public playAudioChunk(base64Chunk: string, mimeType: string = 'audio/webm') {
    this.incomingQueue.push(base64Chunk);
    if (!this.isPlayingQueue) {
      this.processQueue(mimeType);
    }
  }

  private async processQueue(mimeType: string) {
    if (this.incomingQueue.length === 0) {
      this.isPlayingQueue = false;
      return;
    }

    this.isPlayingQueue = true;
    const chunk = this.incomingQueue.shift()!;

    try {
      const audio = new Audio(`data:${mimeType};base64,${chunk}`);
      audio.volume = 1.0;
      await audio.play();

      audio.onended = () => {
        this.processQueue(mimeType);
      };
      audio.onerror = () => {
        this.processQueue(mimeType);
      };
    } catch {
      // Fallback: continue queue
      setTimeout(() => this.processQueue(mimeType), 200);
    }
  }

  /**
   * Get current volume level [0.0 - 1.0] for mic meter
   */
  public getVolumeLevel(): number {
    if (!this.analyser) return 0;
    const dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(dataArray);

    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
      sum += dataArray[i];
    }
    const average = sum / dataArray.length;
    return Math.min(1, average / 128);
  }

  /**
   * Synthesize a walkie-talkie PTT key-down beep / roger chirp
   */
  public playPttBeep(isStart: boolean = true) {
    try {
      const ctx = this.initContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      if (isStart) {
        // High 2-tone chirp
        osc.frequency.setValueAtTime(880, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.08);
      } else {
        // Low release chirp
        osc.frequency.setValueAtTime(1100, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(660, ctx.currentTime + 0.1);
      }

      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.13);
    } catch {
      // AudioContext unavailable
    }
  }

  /**
   * Play alert sound when a new customer arrives online
   */
  public playCustomerOnlineChime() {
    try {
      const ctx = this.initContext();
      const now = ctx.currentTime;

      // Gentle double bell chime (F5 -> A5)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      const gain2 = ctx.createGain();

      osc1.type = 'triangle';
      osc1.frequency.setValueAtTime(698.46, now); // F5
      gain1.gain.setValueAtTime(0.2, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880.0, now + 0.15); // A5
      gain2.gain.setValueAtTime(0.2, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.45);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.65);
    } catch {
      // AudioContext unavailable
    }
  }

  /**
   * Clean up
   */
  public destroy() {
    this.stopRecording();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      try {
        this.audioCtx.close();
      } catch (e) {
        console.warn(e);
      }
    }
  }
}

export const globalAudioEngine = new AudioEngine();
