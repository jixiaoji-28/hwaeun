import { RGBNotes, NoteData } from "./sonificationUtils";
import { AudioSettings } from "../types"; // AudioSettings 타입 경로에 맞게 수정해주세요

const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();

function createHiHatBuffer(
    audioCtx: AudioContext, 
    duration: number = 0.3, 
    releaseTime: number = 0.05
): AudioBuffer {
    const fs = audioCtx.sampleRate;
    const sampleLen = Math.floor(duration * fs);
    const audioBuffer = audioCtx.createBuffer(1, sampleLen, fs);
    const channel = audioBuffer.getChannelData(0);

    // 1. 화이트 노이즈 생성
    for (let i = 0; i < sampleLen; i++) {
        // -1.0에서 1.0 사이의 랜덤 값 (화이트 노이즈)
        channel[i] = Math.random() * 2 - 1; 
    }

    // 2. 간단한 Amplitude Envelope (빠른 Attack과 Decay)
    // AudioBufferSourceNode를 사용할 것이므로, 엔벨로프는 나중에 GainNode로 적용하는 것이 더 정확합니다.
    // 여기서는 매우 짧은 릴리즈만 내장합니다.
    const releaseSamples = Math.floor(releaseTime * fs);

    for (let i = 0; i < sampleLen; i++) {
        if (i > sampleLen - releaseSamples) {
            // 마지막 releaseSamples 구간에서 0으로 선형 감소
            const fade = (sampleLen - i) / releaseSamples;
            channel[i] *= fade;
        }
    }
    
    // 주: Hi-Pass Filter는 AudioBuffer 자체에 적용할 수 없으므로,
    // 이는 'playNote' 함수에서 BiquadFilterNode를 사용하여 실시간으로 적용해야 합니다.
    
    return audioBuffer;
}

function createKickBuffer(
    audioCtx: AudioContext, 
    duration: number = 0.3, // Python 코드의 0.5s 대신 짧은 킥에 맞춰 0.3s로 설정
    freq0: number = 67, 
    pitchDecayLevel: number = 0.1
): AudioBuffer {
    
    const fs = audioCtx.sampleRate;
    const sampleLen = Math.floor(duration * fs);

    // 1. Pitch Envelope (Python의 np.logspace(np.log10(1), np.log10(pitch_decay_level)))
    const pitchEnv = new Float32Array(sampleLen);
    const logStart = Math.log10(1); // 0
    const logEnd = Math.log10(pitchDecayLevel);
    
    for (let i = 0; i < sampleLen; i++) {
        // 로그 공간에서 선형 보간 (Linear interpolation in log space)
        const logValue = logStart + (logEnd - logStart) * (i / sampleLen);
        pitchEnv[i] = Math.pow(10, logValue);
    }

    // 2. Amplitude Envelope (Python의 np.logspace(np.log10(1), np.log10(0.01)))
    const ampEnv = new Float32Array(sampleLen);
    const logAmpEnd = Math.log10(0.01); 
    
    for (let i = 0; i < sampleLen; i++) {
        const logValue = logStart + (logAmpEnd - logStart) * (i / sampleLen);
        ampEnv[i] = Math.pow(10, logValue);
    }
    
    // 3. Instantaneous Frequency
    const freq = new Float32Array(sampleLen);
    for (let i = 0; i < sampleLen; i++) {
        freq[i] = freq0 * pitchEnv[i];
    }

    // 4. Phase Accumulation and Synthesis
    const audioBuffer = audioCtx.createBuffer(1, sampleLen, fs);
    const channel = audioBuffer.getChannelData(0);
    
    let phase = 0;
    
    for (let i = 0; i < sampleLen; i++) {
        // 위상 누적 (Phase Accumulation)
        phase = phase + 2 * Math.PI * freq[i] / fs;
        
        // Output Synthesis
        channel[i] = Math.sin(phase) * ampEnv[i];
    }
    
    return audioBuffer;
}

export class SonificationSequencer {
    private isPlaying: boolean = false;
    private timerId: number | null = null;
    private rOscillator: OscillatorNode | null = null;
    private gOscillator: OscillatorNode | null = null;
    private bOscillator: OscillatorNode | null = null;
    private gainNode: GainNode;
    private masterFilter: BiquadFilterNode; // ✨ [추가] 마스터 필터 노드
    private bChannelType: 'DRUM' | 'OSC' = 'DRUM';
    private kickBuffer: AudioBuffer;
    private hiHatBuffer: AudioBuffer;

    // ✨ [추가] R 채널 Legato 상태 관리 변수
    private currentRPitch: number = 0;
    private currentRGainNode: GainNode | null = null; 
    private currentRDuration: number = 0; // 누적된 지속 시간 (초)

    // ✨ [추가] 시각적 메트릭스 상태
    private visualMetrics = {
        saturation: 0.5,
        brightness: 0.5,
    };

    // ✨ [추가] 오디오 이펙트 노드들
    private effectBus: GainNode;         // 모든 소리가 모이는 입구
    private distortionNode: WaveShaperNode; // 디스토션
    private wahFilter: BiquadFilterNode;    // 와와 필터
    private wahLFO: OscillatorNode;         // 와와 효과를 위한 LFO (저주파 발진기)
    private wahLFO_Gain: GainNode;          // LFO 강도 조절

    constructor() {
        // 1. 노드 생성
        this.effectBus = audioCtx.createGain(); // 이펙트 체인 시작점
        
        // Distortion (WaveShaper)
        this.distortionNode = audioCtx.createWaveShaper();
        this.distortionNode.oversample = '4x'; // 음질 향상

        // Wah-Wah (Bandpass Filter modulated by LFO)
        this.wahFilter = audioCtx.createBiquadFilter();
        this.wahFilter.type = 'bandpass';
        this.wahFilter.Q.value = 5; // 뾰족한 필터 (Wah 느낌 강조)
        this.wahFilter.frequency.value = 1000; // 기준 주파수

        this.wahLFO = audioCtx.createOscillator();
        this.wahLFO.type = 'sine';
        this.wahLFO.frequency.value = 2.5; // 와와 속도 (Hz)

        this.wahLFO_Gain = audioCtx.createGain();
        this.wahLFO_Gain.gain.value = 0; // 초기 깊이 0

        // Master Tone Filter (시각적 Saturation 매핑) ✨ [추가/초기화]
        this.masterFilter = audioCtx.createBiquadFilter(); 
        this.masterFilter.type = 'lowpass';
        this.masterFilter.frequency.setValueAtTime(20000, audioCtx.currentTime); // 완전히 열림
        this.masterFilter.Q.setValueAtTime(1, audioCtx.currentTime);

        // Master Volume
        this.gainNode = audioCtx.createGain();
        this.gainNode.gain.value = 0.5;

        // 2. LFO 연결 (와와 효과: LFO -> Gain -> Filter Frequency)
        this.wahLFO.connect(this.wahLFO_Gain);
        this.wahLFO_Gain.connect(this.wahFilter.frequency);
        this.wahLFO.start();

        // 3. ✨ [핵심 수정] 오디오 신호 체인 연결 (Signal Chain Routing)
        // EffectBus -> Distortion -> WahFilter -> MasterFilter -> MasterGain -> Destination
        
        // 1단계: EffectBus -> Distortion
        this.effectBus.connect(this.distortionNode);
        
        // 2단계: Distortion -> WahFilter
        this.distortionNode.connect(this.wahFilter);
        
        // 3단계: WahFilter -> MasterFilter (추가된 부분)
        this.wahFilter.connect(this.masterFilter); 
        
        // 4단계: MasterFilter -> MasterGain
        this.masterFilter.connect(this.gainNode); 
        
        // 5단계: MasterGain -> Destination
        this.gainNode.connect(audioCtx.destination);
        
        // 4. 버퍼 초기화
        this.kickBuffer = createKickBuffer(audioCtx, 0.3, 67, 0.1);
        this.hiHatBuffer = createHiHatBuffer(audioCtx, 0.3);
        
        this.distortionNode.curve = this.makeDistortionCurve(0);
    }

    public updateAudioSettings(settings: AudioSettings) {
        const currentTime = audioCtx.currentTime;

        // 1. Master Volume
        // 갑작스런 볼륨 변화로 인한 '팝' 노이즈 방지를 위해 0.1초 동안 부드럽게 변경
        this.gainNode.gain.setTargetAtTime(settings.volume, currentTime, 0.1);

        // 2. Distortion (0 ~ 100)
        // 값이 바뀔 때만 커브 재생성 (연산 비용 최적화)
        // settings.distortion 값을 이용해 커브를 만듭니다.
        this.distortionNode.curve = this.makeDistortionCurve(settings.distortion);

        // 3. Wah-Wah (0 ~ 100)
        // LFO의 강도(Gain)를 조절하여 필터가 움직이는 폭을 결정합니다.
        // 0이면 필터가 고정됨, 100이면 주파수가 크게 흔들림(와~와~)
        // 2000은 주파수 변조 폭 (Hz)
        const wahDepth = (settings.wahwah / 100) * 2000; 
        this.wahLFO_Gain.gain.setTargetAtTime(wahDepth, currentTime, 0.1);

        // WahWah가 꺼져있을 때(0)는 필터가 소리를 깎아먹지 않도록 주파수를 조정하거나
        // 아예 필터를 우회(Bypass)하는 게 좋지만, 
        // 간단히 구현하기 위해 Wah가 0일 때는 필터를 평탄하게 펴줍니다.
        if (settings.wahwah === 0) {
             this.wahFilter.Q.setTargetAtTime(0, currentTime, 0.1); // Q를 0으로 (필터 효과 제거)
        } else {
             this.wahFilter.Q.setTargetAtTime(5, currentTime, 0.1); // Q를 다시 높임
        }
    }

    /**
     * ✨ [추가] 이미지 분석 결과를 Sequencer에 업데이트합니다.
     */
    public updateVisualMetrics(saturation: number, brightness: number) {
        // 값을 0에서 1 사이로 정규화
        this.visualMetrics.saturation = Math.max(0, Math.min(1, saturation));
        this.visualMetrics.brightness = Math.max(0, Math.min(1, brightness));
        // ✨ [핵심] 시각적 메트릭스를 오디오 파라미터에 매핑
        this.applyVisualMetricsToAudio();
    }
    
    /**
     * ✨ [추가] 시각적 메트릭스를 실제 오디오 노드에 적용합니다.
     */
    private applyVisualMetricsToAudio() {
        const currentTime = audioCtx.currentTime;
        
        // 1. Brightness -> 마스터 볼륨 (어두울수록 소리도 작아지게)
        // 0.1 ~ 1.0 범위로 매핑 (완전히 0이 되는 것을 방지)
        const newGain = 0.1 + this.visualMetrics.brightness * 0.9; 
        this.gainNode.gain.linearRampToValueAtTime(newGain, currentTime + 0.1);

        // 2. Saturation -> 마스터 필터 (채도가 높을수록 고음역대가 선명하게)
        // 1000 Hz ~ 20000 Hz (매우 먹먹함 ~ 매우 선명함)
        const minFreq = 1000;
        const maxFreq = 20000;
        const newFilterFreq = minFreq + this.visualMetrics.saturation * (maxFreq - minFreq);
        
        // 필터 주파수를 0.1초 동안 부드럽게 변경
        this.masterFilter.frequency.linearRampToValueAtTime(newFilterFreq, currentTime + 0.1);
    }
    

    /**
     * MIDI 음높이(pitch)를 주파수(Hz)로 변환합니다.
     */
    private midiToFreq(midi: number): number {
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    /**
     * ✨ [헬퍼] 디스토션 커브 생성 함수 (수학적 시그모이드 함수)
     * Web Audio API WaveShaperNode에 사용할 파형 배열을 생성합니다.
     * amount 값이 높을수록 소리가 찌그러집니다.
     */
    private makeDistortionCurve(amount: number) {
        const k = typeof amount === 'number' ? amount : 50;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;
        
        // 0이면 직선(변화 없음) 반환
        if (amount === 0) {
             for (let i = 0 ; i < n_samples; ++i ) {
                 const x = i * 2 / n_samples - 1;
                 curve[i] = x;
             }
             return curve;
        }

        // 디스토션 파형 계산 (일반적인 시그모이드 함수 변형)
        for (let i = 0; i < n_samples; ++i ) {
            const x = i * 2 / n_samples - 1;
            // 왜곡 정도(k)에 따라 입력(x)을 변형하여 출력(curve[i])으로 매핑
            curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
        }
        return curve;
    }

    /**
     * 특정 NoteData를 연주합니다.
     */
    private playNote(note: NoteData, oscillator: OscillatorNode | null, channel: 'R' | 'G' | 'B', stepDuration?: number) {       
        const currentTime = audioCtx.currentTime;
        const targetGainValue = 0.3 * note.velocity;
        
        // ----------------------------------------------------
        // 1. R 채널 (멜로디) Legato 처리
        // ----------------------------------------------------
        if (channel === 'R') {
            const nextPitch = note.pitch;
            const isRest = nextPitch === 0 || note.velocity < 0.01;

            if (!isRest && nextPitch === this.currentRPitch && this.currentRGainNode) {
                // 음이 같고 끊기지 않았다면: Duration만 연장
                this.currentRDuration += stepDuration!;
                
                // R 채널은 이미 연결되어 있으므로 추가 작업을 건너뜁니다.
                return;
            } 
            
            // 피치가 다르거나 휴지부이거나, 새로운 음이 시작되는 경우: 이전 음을 끊습니다.
            if (this.currentRGainNode) {
                // 이전 Gain Node를 현재 시점에서 부드럽게 릴리즈합니다.
                this.currentRGainNode.gain.linearRampToValueAtTime(0.0001, currentTime + 0.05); 
                
                // 릴리즈 후 연결 해제 (약간의 딜레이를 주어 깔끔하게 끊기도록)
                setTimeout(() => {
                    this.currentRGainNode?.disconnect(this.gainNode);
                    this.currentRGainNode = null;
                }, 50); 
            }
            
            this.currentRPitch = 0; // 초기화
            this.currentRDuration = 0;

            if (isRest) {
                return; // 휴지부면 여기서 종료
            }
            
            // 새로운 음 시작 로직
            const freq = this.midiToFreq(nextPitch);
            const noteGain = this.gainNode.context.createGain();
            noteGain.gain.setValueAtTime(0.001, currentTime); 
            noteGain.connect(this.effectBus);

            if (oscillator) {
                oscillator.frequency.setValueAtTime(freq, currentTime);
                oscillator.connect(noteGain);
            }

            // Attack (멜로디는 부드러운 Attack)
            noteGain.gain.linearRampToValueAtTime(targetGainValue, currentTime + 0.05); 

            // 상태 업데이트 (다음 스텝에서 Legato를 이어갈 수 있도록)
            this.currentRPitch = nextPitch;
            this.currentRGainNode = noteGain;
            this.currentRDuration = stepDuration;

            // R 채널은 타이머가 끝날 때까지 끊지 않습니다 (Legato).
            // Stop 함수에서 일괄 정리됩니다.
            return;
        }
        if (note.pitch === 0 || note.velocity < 0.01) { return; }

        const noteGain = this.gainNode.context.createGain();
        noteGain.gain.setValueAtTime(0.001, currentTime); 
        noteGain.connect(this.effectBus);
        
        let noteDuration: number;
        
        if (channel === 'G') { // ✨ G 채널만 처리
        noteDuration = 0.15; // 고정된 플럭 길이
        const freq = this.midiToFreq(note.pitch);
        if(oscillator) oscillator.frequency.setValueAtTime(freq, currentTime);
        
        // Oscillator 연결
        if(oscillator) oscillator.connect(noteGain);

        // G 채널 엔벨로프 (짧게 끊기)
        noteGain.gain.linearRampToValueAtTime(targetGainValue, currentTime + 0.02); 
        noteGain.gain.linearRampToValueAtTime(0.0001, currentTime + noteDuration); 

        // G 채널 연결 해제 (짧게 끊김)
        setTimeout(() => {
            // 🚨 [수정] this.gainNode 대신 this.effectBus에 disconnect
            try {
                noteGain.disconnect(this.effectBus); 
            } catch(e) { /* 이미 끊긴 경우 무시 */ }
        }, noteDuration * 1000 + 50); 
        
        return; // G 채널 처리 완료
    } if (channel === 'B' && this.bChannelType === 'DRUM') { // ✨ B 채널만 처리
        // 🚨 [수정] noteGain이 이미 위에서 생성되었으므로, 여기서 다시 생성하지 않음
        // const noteGain = this.gainNode.context.createGain(); 
        // noteGain.gain.setValueAtTime(0.001, currentTime); 
        // noteGain.connect(this.effectBus); 
        
        const drumPitch = note.pitch; 
        const MID_B_PITCH = 42; 

        let bufferToUse: AudioBuffer;
        let drumTargetGainValue: number; // 변수 이름 충돌 방지
        let applyHiPassFilter: boolean; 

        if (drumPitch > MID_B_PITCH) {
            bufferToUse = this.hiHatBuffer;
            drumTargetGainValue = 0.2 * note.velocity; 
            applyHiPassFilter = true;
        } else {
            bufferToUse = this.kickBuffer;
            drumTargetGainValue = 0.6 * note.velocity;
            applyHiPassFilter = false;
        }

        const drumSource = audioCtx.createBufferSource();
        drumSource.buffer = bufferToUse;

        let lastNode: AudioNode = noteGain; // 마지막 노드는 noteGain으로 시작

        if (applyHiPassFilter) {
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'highpass';
            filter.frequency.setValueAtTime(6000, currentTime);
            
            drumSource.connect(filter);
            filter.connect(noteGain);
        } else {
            drumSource.connect(noteGain);
        }

        drumSource.start(currentTime);
        
        noteDuration = 0.2; // 드럼 지속 시간
        
        // Attack & Release
        noteGain.gain.linearRampToValueAtTime(drumTargetGainValue, currentTime + 0.005); 
        noteGain.gain.linearRampToValueAtTime(0.0001, currentTime + noteDuration); 

        // 정리
        drumSource.stop(currentTime + noteDuration + 0.05);
        drumSource.onended = () => {
             // noteGain이 effectBus에 연결되었으므로, noteGain을 그냥 끊으면 됨 (모든 연결 끊기)
            noteGain.disconnect();
        };
        return;
    } 
    
    try {
        noteGain.disconnect(this.effectBus);
    } catch(e) { /* ignore */ }

        // 3. G 채널 엔벨로프 (짧게 끊기)
        noteGain.gain.linearRampToValueAtTime(targetGainValue, currentTime + 0.02); 
        noteGain.gain.linearRampToValueAtTime(0.0001, currentTime + noteDuration); 

        // G 채널 연결 해제 (짧게 끊김)
        setTimeout(() => {
            noteGain.disconnect(this.gainNode);
        }, noteDuration * 1000 + 50); 
    }


    /**
     * R, G, B 세 채널 시퀀스를 재생합니다.
     */
    public play(notes: RGBNotes, bpm: number = 120, downsampleRate: number = 2) { // ✨ [변경] downsampleRate 인자 추가 (기본값 2)
        if (this.isPlaying) this.stop();
        if (notes.rNotes.length === 0) return;

        if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
            
            // 2. 오실레이터 초기화 및 파형(음색) 설정
            // R 채널 (멜로디): Sawtooth (소리가 잘 들리는 날카로운 멜로디)
            this.rOscillator = audioCtx.createOscillator();
            this.rOscillator.type = 'sawtooth'; 
            this.rOscillator.start(); 

            // G 채널 (플럭): Square (통통 튀는 느낌)
            this.gOscillator = audioCtx.createOscillator();
            this.gOscillator.type = 'square';
            this.gOscillator.start();

            // B 채널 (드럼): 오실레이터는 사용하지 않지만, stop/start 처리를 위해 인스턴스 유지
            this.bOscillator = audioCtx.createOscillator(); // 더미 또는 일반적인 용도로 유지
            this.bOscillator.type = 'sine'; // 드럼으로 사용되므로 실제 파형은 중요하지 않음
            this.bOscillator.start();


            const stepIntervalMs = (60 / bpm) * 1000 * 0.5; 
            let noteIndex = 0;
            const totalNotes = notes.rNotes.length;

            this.isPlaying = true;
            
            this.timerId = window.setInterval(() => {
                if (!this.isPlaying) {
                    this.stop();
                    return;
                }

                const rNote = notes.rNotes[noteIndex];
                const gNote = notes.gNotes[noteIndex];
                const bNote = notes.bNotes[noteIndex];
                const effectiveDuration = stepIntervalMs / 1000 * downsampleRate;

                // 3개 파트 동시 연주 (B채널은 playNote 내부에서 드럼으로 처리됨)
                this.playNote(rNote, this.rOscillator, 'R', effectiveDuration); // ✨ [변경] duration 인자 추가
                this.playNote(gNote, this.gOscillator, 'G'); // ✨ [변경] duration 인자 추가
                this.playNote(bNote, null, 'B'); // ✨ [변경] duration 인자 추가

                noteIndex = (noteIndex + downsampleRate) % totalNotes; 

                // 인덱스가 총 노트 수를 초과하면 처음으로 돌아가거나 멈춥니다.
                if (noteIndex >= totalNotes) {
                    // noteIndex = 0; // 반복 연주
                    noteIndex = totalNotes; // 한 번만 연주하고 멈추려면 이 코드를 사용하세요.
                    if (noteIndex >= totalNotes) this.stop();
                }
                
            }, stepIntervalMs);
        }
    /**
     * 연주를 중단하고 오실레이터를 정리합니다.
     */
    public stop() {
        this.isPlaying = false;
        if (this.timerId !== null) {
            window.clearInterval(this.timerId);
            this.timerId = null;
        }

        // ✨ [추가] R 채널 Legato 상태 정리
        if (this.currentRGainNode) {
            this.currentRGainNode.gain.cancelScheduledValues(audioCtx.currentTime);
            this.currentRGainNode.gain.setValueAtTime(0.0001, audioCtx.currentTime); 
            // 🚨 문제 해결 부분: disconnect 호출을 try...catch로 감쌉니다.
            try {
                this.currentRGainNode.disconnect(this.gainNode); // <--- 여기서 에러가 났을 가능성이 높습니다.
            } catch (e) {
                // 이미 연결이 끊어졌거나, 연결되지 않은 대상일 경우 에러 무시
                console.warn("currentRGainNode already disconnected or not connected.", e);
            }
            this.currentRGainNode = null;
        }
        this.currentRPitch = 0;
        this.currentRDuration = 0;

        const stopAndDisconnect = (osc: OscillatorNode | null) => {
            if (osc) {
                try {
                    osc.stop(0);
                    osc.disconnect();
                } catch (e) {
                    // 이미 정지되었을 경우 에러 무시
                }
            }
        };

        stopAndDisconnect(this.rOscillator);
        stopAndDisconnect(this.gOscillator);
        stopAndDisconnect(this.bOscillator);
        
        this.rOscillator = null;
        this.gOscillator = null;
        this.bOscillator = null;
    }
}

