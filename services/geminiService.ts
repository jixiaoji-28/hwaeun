import { GoogleGenAI, Type } from "@google/genai";
import { MusicRecommendation } from "../types";

const apiKey = process.env.GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey });

export const analyzeDrawing = async (base64Image: string): Promise<MusicRecommendation> => {
  // Remove header if present
  const cleanBase64 = base64Image.replace(/^data:image\/(png|jpg|jpeg);base64,/, "");

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-lite",
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: "image/png",
              data: cleanBase64
            }
          },
          {
            text: `Analyze this drawing. The user is in a "Hwaeun" digital art studio with a retro cassette tape/vinyl aesthetic. 
            
            Based on the visual elements (lines, color palette, chaos vs calm), suggest a music recommendation that fits this vintage vibe.
            
            PREFERRED GENRES: Lo-fi Hip Hop, City Pop, Japanese Jazz, Dream Pop, Ambient Tape Loops, Synthwave, Indie Folk, Bossa Nova.
            Avoid modern EDM or generic Pop unless it fits the retro theme.
            
            1. mood: Emotional atmosphere (match between 4 choices 'calm' | 'energetic' | 'melancholic' | 'lofi').
            2. genre: A specific vintage-friendly genre.
            3. suggestedTrack: A poetic, imaginary track title that sounds like an obscure B-side or an indie masterpiece.
            4. reasoning: Brief, poetic connection between the art and the music.
            5. tempo: Slow, Medium, or Fast.`
          }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            mood: { type: Type.STRING, description: "The emotional mood of the drawing." },
            genre: { type: Type.STRING, description: "A suitable retro/vintage music genre." },
            suggestedTrack: { type: Type.STRING, description: "A creative, imaginary track title." },
            reasoning: { type: Type.STRING, description: "Why this music fits the drawing." },
            tempo: { type: Type.STRING, description: "Suggested tempo." }
          },
          required: ["mood", "genre", "suggestedTrack", "reasoning", "tempo"]
        }
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error("No response from AI");
    }
    return JSON.parse(text) as MusicRecommendation;

  } catch (error) {
    console.error("Error analyzing drawing:", error);
    // Fallback for demo purposes if API key is invalid or fails
    return {
      mood: "Static Noise",
      genre: "Tape Loop",
      suggestedTrack: "Untitled Track 4",
      reasoning: "The signal is weak, but the tape is still spinning...",
      tempo: "Medium"
    };
  }
};