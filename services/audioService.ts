import { AudioSettings } from "../types";

interface VisualMetrics {
  saturation: number; // 0 to 1
  brightness: number; // 0 to 1
}

class AudioService {
  private audioContext: AudioContext | null = null;
  private mainGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private filterNode: BiquadFilterNode | null = null;
  
  // Tape Effects
  private warbleDelay: DelayNode | null = null;
  private warbleOsc: OscillatorNode | null = null;
  private warbleGain: GainNode | null = null;
  private tapeDelayNode: DelayNode | null = null;
  private tapeFeedback: GainNode | null = null;

  // Music State
  private isPlaying: boolean = false;
  private currentStyle: 'calm' | 'energetic' | 'melancholic' | 'lofi' = 'calm';
  private sequenceInterval: number | null = null;
  private beatCount: number = 0;
  
  // Ambience Nodes
  private vinylNode: AudioBufferSourceNode | null = null;
  private vinylGain: GainNode | null = null;
  private rainNode: AudioBufferSourceNode | null = null;
  private rainGain: GainNode | null = null;

  // Music state from the image
  private visualMetrics: VisualMetrics = { saturation: 0.5, brightness: 0.5};

  constructor() {
    // Initialize lazily
  }

  private init() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // MASTER CHAIN: Source -> Tape Delay -> Filter -> Warble -> Compressor -> MainGain -> Dest
      
      this.mainGain = this.audioContext.createGain();
      this.compressor = this.audioContext.createDynamicsCompressor();
      this.filterNode = this.audioContext.createBiquadFilter();
      
      // Tape Warble (Pitch Instability)
      this.warbleDelay = this.audioContext.createDelay(1.0);
      this.warbleDelay.delayTime.value = 0.05; // 50ms base delay
      
      this.warbleOsc = this.audioContext.createOscillator();
      this.warbleOsc.type = 'sine';
      this.warbleOsc.frequency.value = 0.5; // 0.5Hz wobble
      
      this.warbleGain = this.audioContext.createGain();
      this.warbleGain.gain.value = 0.0008; // Depth of wobble
      
      this.warbleOsc.connect(this.warbleGain);
      this.warbleGain.connect(this.warbleDelay.delayTime);
      this.warbleOsc.start();

      // Tape Delay (Echo)
      this.tapeDelayNode = this.audioContext.createDelay(2.0);
      this.tapeFeedback = this.audioContext.createGain();
      this.tapeFeedback.gain.value = 0.3;
      
      // Routing
      // 1. Synth signals will connect to filterNode
      // 2. Filter -> Warble
      this.filterNode.connect(this.warbleDelay);
      
      // 3. Warble -> Compressor
      this.warbleDelay.connect(this.compressor);
      
      // 4. Delay Send/Return
      this.warbleDelay.connect(this.tapeDelayNode);
      this.tapeDelayNode.connect(this.tapeFeedback);
      this.tapeFeedback.connect(this.tapeDelayNode); // Feedback loop
      this.tapeDelayNode.connect(this.compressor);   // Mix wet signal

      // 5. Compressor -> Main -> Out
      this.compressor.connect(this.mainGain);
      this.mainGain.connect(this.audioContext.destination);

      // Defaults
      this.filterNode.type = 'lowpass';
      this.filterNode.frequency.value = 20000;
      this.compressor.threshold.value = -12;
      this.compressor.ratio.value = 4;
    }
  }

  // --- AMBIENCE ENGINE ---

  private createNoiseBuffer(): AudioBuffer {
    const ctx = this.audioContext!;
    const bufferSize = ctx.sampleRate * 2; // 2 seconds loop
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  public toggleVinyl(active: boolean) {
    this.init();
    if (!this.audioContext) return;

    if (active) {
        if (this.vinylNode) return;
        
        const bufferSize = this.audioContext.sampleRate * 5; 
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            if (Math.random() > 0.9995) {
                data[i] = Math.random() * 0.5; // Click
            } else {
                data[i] = Math.random() * 0.03; // Hiss
            }
        }

        this.vinylNode = this.audioContext.createBufferSource();
        this.vinylNode.buffer = buffer;
        this.vinylNode.loop = true;
        
        this.vinylGain = this.audioContext.createGain();
        this.vinylGain.gain.value = 0.15;
        
        const filter = this.audioContext.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 300;

        this.vinylNode.connect(filter);
        filter.connect(this.vinylGain);
        // Vinyl bypasses tape delay/warble for clarity, goes straight to comp
        this.vinylGain.connect(this.compressor!); 
        
        this.vinylNode.start();
    } else {
        if (this.vinylNode) {
            this.vinylNode.stop();
            this.vinylNode.disconnect();
            this.vinylNode = null;
        }
    }
  }

  public toggleRain(active: boolean) {
    this.init();
    if (!this.audioContext) return;

    if (active) {
        if (this.rainNode) return;
        
        const buffer = this.createNoiseBuffer();
        this.rainNode = this.audioContext.createBufferSource();
        this.rainNode.buffer = buffer;
        this.rainNode.loop = true;
        
        const pinkFilter = this.audioContext.createBiquadFilter();
        pinkFilter.type = 'lowpass';
        pinkFilter.frequency.value = 400;
        
        this.rainGain = this.audioContext.createGain();
        this.rainGain.gain.value = 0.2;

        this.rainNode.connect(pinkFilter);
        pinkFilter.connect(this.rainGain);
        this.rainGain.connect(this.compressor!);
        
        this.rainNode.start();
    } else {
        if (this.rainNode) {
            this.rainNode.stop();
            this.rainNode.disconnect();
            this.rainNode = null;
        }
    }
  }

  // Update the visual metrics from the image analysis
  public updateVisualMetrics(saturatoin: number, brightness: number) {
    this.visualMetrics.saturation = Math.max(0, Math.min(1, saturatoin));
    this.visualMetrics.brightness = Math.max(0, Math.min(1, brightness));
  }
  // --- GENERATIVE MUSIC ENGINE (RETRO ALBUM STYLE) ---

  public async startMusic(style: 'calm' | 'energetic' | 'melancholic' | 'lofi') {

    this.init();
    this.isPlaying = false;
    if (this.audioContext?.state === 'suspended') {
        await this.audioContext.resume();
    }

    if (this.currentStyle !== style) {
      this.beatCount = 0;
    }
    
    this.currentStyle = style;

    if (this.isPlaying) return;

    this.isPlaying = true;

    // BPM Calculation
    let bpm = 80;
    if (style === 'energetic') bpm = 120; // City Pop
    if (style === 'lofi') bpm = 60;
    if (style === 'calm') bpm = 50;

    const interval = (60 / bpm) * 1000; 

    if (this.sequenceInterval) clearInterval(this.sequenceInterval);

    this.sequenceInterval = window.setInterval(() => {
        this.playNextBar();
    }, interval);
    
    // Play first immediately
    this.playNextBar();
  }

  public setMusicStyle(style: 'calm' | 'energetic' | 'melancholic' | 'lofi') {
      this.currentStyle = style;
      if (this.isPlaying) {
          this.stopMusic();
          this.startMusic(style);
      }
  }

  private playNextBar() {
     if (!this.audioContext || !this.filterNode) return;
     const t = this.audioContext.currentTime;
     const { saturation, brightness } = this.visualMetrics;

     // GENRE SPECIFIC CHORDS
     // 60 = Middle C
const chordBanks = {
        lofi: {
            dark: [ // Minor 9ths, Diminished (우울, 몽환)
                [60, 63, 67, 70], // Cm7
                [56, 59, 62, 65], // Gdim7
                [58, 61, 65, 68], // Bbm7
                [55, 58, 62, 65], // Gm7b5
            ],
            bright: [ // Major 7ths, Add9 (따뜻, 밝음)
            [60, 63, 67, 70], // Cm7
            [58, 62, 65, 69], // Bbmaj7
            [56, 60, 63, 67], // Abmaj7
            [67, 71, 74, 77], // G7
            ]
        },
        calm: {
            dark: [ // Sus chords, Minor (정적, 차분함)
                [60, 65, 67], // Csus4
                [57, 60, 64], // Am
                [62, 65, 69], // Dm
                [64, 67, 71], // Em
            ],
            bright: [ // Open Major, Lydian (평화, 희망)
                [60, 64, 67], // C
                [65, 69, 72], // F (Lydian feel)
                [67, 71, 74], // G
                [72, 76, 79], // C (High octave)
            ]
        },
        melancholic: {
            dark: [ // Deep Minor, Clusters (슬픔, 심연)
                [57, 60, 64, 65], // Am(add b6)
                [53, 57, 60, 64], // Fmaj7
                [59, 62, 65],     // Bdim
                [64, 67, 71, 72], // Em(add b6)
            ],
            bright: [ // Relative Major (아련한 추억)
                [60, 64, 67],     // C
                [55, 59, 62],     // G
                [53, 57, 60],     // F
                [64, 68, 71],     // E major (Picardy third feel)
            ]
        },
        energetic: {
            dark: [ // Funky Minor, Dorian (긴장감, 밤거리)
                [60, 63, 65, 69], // Cm11
                [58, 61, 65, 68], // Bbm7
                [63, 66, 70, 73], // Eb7
                [67, 70, 74, 77], // Gm7
            ],
            bright: [ // City Pop Major (활기, 낮)
                [60, 64, 67, 71], // Cmaj7
                [62, 66, 69, 73], // D7
                [64, 67, 71, 74], // Em7
                [65, 69, 72, 76], // Fmaj7
            ]
        }
      };

     const currentBank = chordBanks[this.currentStyle];
     const selectedPool = (Math.random() < saturation) ? currentBank.bright : currentBank.dark;
     const chordNotes = selectedPool[this.beatCount % selectedPool.length];
     const rootNote = chordNotes[0];

     const dynamicScale = 0.3 + (brightness * 1.2);

     // 1. CHORDS (Vintage Keys)
     chordNotes.forEach((note, i) => {
         // Stagger notes slightly for human feel (strum)
         const stagger = i * 0.03; 
         const duration = this.currentStyle === 'energetic' ? 0.4 : 1.5;
         // Randomize voicing occasionally
         let finalNote = note;
         if (saturation <0.3 && Math.random() > 0.7) finalNote -= 12;
         this.triggerVintageKey(this.midiToFreq(finalNote), t + stagger, duration);
     });
     
     // 2. BASS (Sine Sub)
     // lower brightness = more prominent bass
     const bassVol = 1.0 + ((1.0 - brightness) * 0.5);
     this.triggerBass(this.midiToFreq(rootNote - 24), t, 0.5, bassVol); // Root down 2 octaves
    //  if (this.currentStyle === 'energetic' || this.currentStyle === 'lofi') {
    //      this.triggerBass(this.midiToFreq(rootNote - 24), t, 0.5, bassVol*0.2); // Syncopated
    //  }

     // 3. DRUMS (Simple Noise Hi-Hats / Clicks)
     // Play 4 ticks per bar
     if (this.currentStyle !== 'calm') {
        const ticks = (this.currentStyle === 'energetic' || brightness > 0.7) ? 8 : 4;
        const interval = 1 / ticks;
         for(let i=0; i<4; i++) {
             const time = t + (i * interval); // simple division (not perfectly synced to BPM var here, simplified)
             // Accent the backbeat
             let vol = (i % 2 !== 0) ? 0.7 : 0.3; 
             vol *= dynamicScale;

             if (saturation < 0.4) vol *= 0.6;

             this.triggerDrum(time, vol);
         }
     }

     // 4. MELODY (Occasional)
     if (Math.random()  < (saturation * 0.8)) {
         const scaleNote = chordNotes[Math.floor(Math.random() * chordNotes.length)] + 12;
         this.triggerVintageKey(this.midiToFreq(scaleNote), t + 0.5, 0.5, 0.5);
     }

     this.beatCount++;
  }

  private triggerVintageKey(freq: number, time: number, duration: number, volumeScale: number = 1.0) {
      if (!this.audioContext || !this.filterNode) return;

      // "Rhodes-ish" FM Synthesis
      const t = time;
      const carrier = this.audioContext.createOscillator();
      const modulator = this.audioContext.createOscillator();
      const modGain = this.audioContext.createGain();
      const env = this.audioContext.createGain();
      
      carrier.type = 'triangle';
      carrier.frequency.value = freq;
      
      modulator.type = 'sine';
      modulator.frequency.value = freq * 4; 
      modGain.gain.value = freq * 0.5 * (this.visualMetrics.brightness + 0.5); // FM Depth
      
      modulator.connect(modGain);
      modGain.connect(carrier.frequency);
      
      carrier.connect(env);
      env.connect(this.filterNode);
      
      // Envelope
      env.gain.setValueAtTime(0, t);
      env.gain.linearRampToValueAtTime(0.15 * volumeScale, t + 0.02); 
      env.gain.exponentialRampToValueAtTime(0.08 * volumeScale, t + 0.2); 
      env.gain.exponentialRampToValueAtTime(0.001, t + duration); 
      
      carrier.start(t);
      modulator.start(t);
      carrier.stop(t + duration);
      modulator.stop(t + duration);
  }

  private triggerBass(freq: number, time: number, duration: number, volumeScale: number = 1.0) {
      if (!this.audioContext || !this.filterNode) return;
      
      const osc = this.audioContext.createOscillator();
      const gain = this.audioContext.createGain();
      
      osc.type = 'triangle'; // Warmer than sine
      osc.frequency.setValueAtTime(freq, time);
      
      gain.gain.setValueAtTime(0, time);
      gain.gain.linearRampToValueAtTime(volumeScale, time + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
      
      osc.connect(gain);
      gain.connect(this.filterNode);
      
      osc.start(time);
      osc.stop(time + duration);
  }

  private triggerDrum(time: number, vol: number) {
      if (!this.audioContext || !this.filterNode) return;

      // White Noise Burst
      const bufferSize = this.audioContext.sampleRate * 0.05;
      const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      for(let i=0; i<bufferSize; i++) data[i] = Math.random() * 2 - 1;

      const noise = this.audioContext.createBufferSource();
      noise.buffer = buffer;
      
      const noiseFilter = this.audioContext.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.value = 5000;
      
      const gain = this.audioContext.createGain();
      gain.gain.setValueAtTime(vol, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);
      
      noise.connect(noiseFilter);
      noiseFilter.connect(gain);
      gain.connect(this.mainGain!); // Direct to main, bypass delay for crispness
      
      noise.start(time);
  }

  private midiToFreq(m: number) {
      return 440 * Math.pow(2, (m - 69) / 12);
  }

  public stopMusic() {
    if (this.sequenceInterval) {
        clearInterval(this.sequenceInterval);
        this.sequenceInterval = null;
    }
    this.isPlaying = false;
  }
  
  // --- UI SOUND EFFECTS ---
  public playSFX(type: 'click' | 'switch' | 'paper' | 'stamp' | 'success') {
    this.init();
    if (!this.audioContext || !this.mainGain) return;
    
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }

    const t = this.audioContext.currentTime;
    const sfxGain = this.audioContext.createGain();
    sfxGain.connect(this.mainGain!);

    if (type === 'click') {
      const osc = this.audioContext.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, t);
      osc.frequency.exponentialRampToValueAtTime(600, t + 0.05);
      sfxGain.gain.setValueAtTime(0.1, t);
      sfxGain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      osc.connect(sfxGain);
      osc.start(t);
      osc.stop(t + 0.05);
    }
    else if (type === 'switch') {
       const osc = this.audioContext.createOscillator();
       osc.type = 'square';
       osc.frequency.setValueAtTime(300, t);
       osc.frequency.exponentialRampToValueAtTime(50, t + 0.04);
       sfxGain.gain.setValueAtTime(0.05, t);
       sfxGain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
       osc.connect(sfxGain);
       osc.start(t);
       osc.stop(t + 0.04);
    }
    else if (type === 'stamp') {
       const osc = this.audioContext.createOscillator();
       osc.type = 'triangle';
       osc.frequency.setValueAtTime(400, t);
       osc.frequency.linearRampToValueAtTime(600, t + 0.1);
       sfxGain.gain.setValueAtTime(0.1, t);
       sfxGain.gain.linearRampToValueAtTime(0, t + 0.1);
       osc.connect(sfxGain);
       osc.start(t);
       osc.stop(t + 0.1);
    }
    else if (type === 'paper') {
       const bufferSize = this.audioContext.sampleRate * 0.2;
       const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
       const data = buffer.getChannelData(0);
       for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
       const noise = this.audioContext.createBufferSource();
       noise.buffer = buffer;
       const filter = this.audioContext.createBiquadFilter();
       filter.type = 'lowpass';
       filter.frequency.value = 1000;
       noise.connect(filter);
       filter.connect(sfxGain);
       sfxGain.gain.setValueAtTime(0.3, t);
       sfxGain.gain.exponentialRampToValueAtTime(0.001, t + 0.2);
       noise.start(t);
    }
  }

  public stop() {
    this.stopMusic();
    this.toggleVinyl(false);
    this.toggleRain(false);
  }

  public updateSettings(settings: AudioSettings) {
    this.init();
    if (!this.audioContext || !this.mainGain || !this.filterNode) return;

    // Parameters
    this.mainGain.gain.setTargetAtTime(settings.volume, this.audioContext.currentTime, 0.1);
    
    // Filter
    const freq = Math.max(100, Math.min(20000, settings.filter));
    this.filterNode.frequency.setTargetAtTime(freq, this.audioContext.currentTime, 0.1);

    // Toggle Ambiences
    this.toggleVinyl(settings.vinylNoise);
    this.toggleRain(settings.rainNoise);
    
    if (this.isPlaying && this.currentStyle !== settings.musicStyle) {
        this.setMusicStyle(settings.musicStyle);
    }
  }
}

export const audioService = new AudioService();
