export interface NoteData {
    pitch: number;
    velocity: number;
}

// 멜로디 파트 구조: R, G, B 세 파트의 음표를 동시에 반환합니다.
export interface RGBNotes {
    rNotes: NoteData[];
    gNotes: NoteData[];
    bNotes: NoteData[];
}

// 음역대 정의 (요청하신 대로 C3~C6 사이 3개 옥타브 분리)
const CHANNEL_R_RANGE = { MIN_MIDI: 60, MAX_MIDI: 72 }; // C5 ~ C6 (13개 음)
const CHANNEL_G_RANGE = { MIN_MIDI: 48, MAX_MIDI: 60 }; // C4 ~ C5 (13개 음)
const CHANNEL_B_RANGE = { MIN_MIDI: 48, MAX_MIDI: 60 }; // C3 ~ C4 (13개 음)

export const extractNotesFromDrawing = (base64Image: string, steps: number = 128): Promise<RGBNotes> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Canvas context not available'));
                return;
            }

            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0, img.width, img.height);

            const { width, height } = img;
            const stepWidth = Math.max(1, Math.floor(width / steps));

            const rNotes: NoteData[] = [];
            const gNotes: NoteData[] = [];
            const bNotes: NoteData[] = []

            for (let i = 0; i < steps; i++) {
                const xStart = i * stepWidth;
                const data = ctx.getImageData(xStart, 0, stepWidth, height).data;
                
                let brightestR: { y: number, value: number } | null = null;
                let brightestG: { y: number, value: number } | null = null;
                let brightestB: { y: number, value: number } | null = null;

                for (let y = 0; y < height; y++) {
                    for (let xOffset = 0; xOffset < stepWidth; xOffset++) {
                        const index = (y * stepWidth + xOffset) * 4;
                        const r = data[index];
                        const g = data[index + 1];
                        const b = data[index + 2];
                        

                        // R 채널 피크 추적 (가장 Y 좌표가 작은(=높은) 곳 + R 값이 높은 픽셀)
                        if (r > 70 && (brightestR === null || r > brightestR.value || (r === brightestR.value && y < brightestR.y))) {
                             brightestR = { y, value: r };
                        }
                        
                        // G 채널 피크 추적
                        if (g > 70 && (brightestG === null || g > brightestG.value || (g === brightestG.value && y < brightestG.y))) {
                             brightestG = { y, value: g };
                        }
                        
                        // B 채널 피크 추적
                        if (b > 70 && (brightestB === null || b > brightestB.value || (b === brightestB.value && y < brightestB.y))) {
                             brightestB = { y, value: b };
                        }
                    } // xOffset 루프 종료
                } // y 루프 종료

                const createNote = (peak: { y: number, value: number } | null, range: typeof CHANNEL_R_RANGE): NoteData => {
                    if (!peak) return { pitch: 0, velocity: 0 }; // 픽셀 없으면 휴지부

                    const { MIN_MIDI, MAX_MIDI } = range;
                    const MIDI_RANGE = MAX_MIDI - MIN_MIDI;

                    // Y축 위치를 해당 채널의 MIDI 음역대에 매핑 (높은 Y -> 낮은 MIDI)
                    const normalizedY = peak.y / height; // 0 (상단) ~ 1 (하단)
                    
                    // (1 - normalizedY)로 Y축 반전: 상단(작은 Y)일수록 높은 음이 됩니다.
                    const pitch = Math.round(MIN_MIDI + (1 - normalizedY) * MIDI_RANGE);
                    
                    // Velocity는 해당 채널의 강도(0~255)에 비례
                    const velocity = peak.value / 255; 
                    
                    return { pitch, velocity };
                };
                
                // R 채널 노트 (C5-C6, 고음)
                rNotes.push(createNote(brightestR, CHANNEL_R_RANGE));

                // G 채널 노트 (C4-C5, 중음)
                gNotes.push(createNote(brightestG, CHANNEL_G_RANGE));

                // B 채널 노트 (C3-C4, 저음)
                bNotes.push(createNote(brightestB, CHANNEL_B_RANGE));
            } // X축 루프 종료
            
            resolve({ rNotes, gNotes, bNotes });
        };

        img.onerror = (err) => reject(err);
        img.src = base64Image;
    });
};