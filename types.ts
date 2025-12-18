
export interface AudioSettings {
  volume: number;
  reverb: number; // 0 to 1
  filter: number; // Frequency 20 to 20000
  distortion: number; // 0 to 100
  wahwah: number;
  vinylNoise: boolean;
  rainNoise: boolean;
  musicStyle: 'calm' | 'energetic' | 'melancholic' | 'lofi';
}

export interface MusicRecommendation {
  mood: string;
  genre: string;
  suggestedTrack: string;
  reasoning: string;
  tempo: string;
  visualText?: string;
}

export enum AppState {
  HOME = 'HOME',
  DRAWING = 'DRAWING',
  ABOUT = 'ABOUT'
}
