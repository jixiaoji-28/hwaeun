// src/services/geminiService.ts
import { MusicRecommendation } from "../types";

// 使用 Vercel 后端 API（生产环境）
const API_ENDPOINT = 'https://hwaeun-102o2dgdh-jias-projects-ed7703e5.vercel.app/api/gemini';

export const analyzeDrawing = async (base64Image: string): Promise<MusicRecommendation> => {
  try {
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageBase64: base64Image,
        prompt: `Analyze this drawing. The user is in a "Hwaeun" digital art studio with a retro cassette tape/vinyl aesthetic. 
        
        Based on the visual elements (lines, color palette, chaos vs calm), suggest a music recommendation that fits this vintage vibe.
        
        PREFERRED GENRES: Lo-fi Hip Hop, City Pop, Japanese Jazz, Dream Pop, Ambient Tape Loops, Synthwave, Indie Folk, Bossa Nova.
        Avoid modern EDM or generic Pop unless it fits the retro theme.
        
        Return a JSON object with these fields:
        1. mood: Emotional atmosphere (e.g., "Nostalgic Sunset", "Midnight Neon", "Rainy Sunday").
        2. genre: A specific vintage-friendly genre.
        3. suggestedTrack: A poetic, imaginary track title that sounds like an obscure B-side or an indie masterpiece.
        4. reasoning: Brief, poetic connection between the art and the music.
        5. tempo: Slow, Medium, or Fast.
        
        Example:
        {
          "mood": "Nostalgic Sunset",
          "genre": "City Pop",
          "suggestedTrack": "Neon Highway Dreams",
          "reasoning": "The warm colors and flowing lines evoke a late 80s Tokyo drive.",
          "tempo": "Medium"
        }`
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `API Error: ${response.status}`);
    }

    const data = await response.json();
    
    // 解析返回的结果
    let recommendation: MusicRecommendation;
    
    if (data.result) {
      // 尝试解析 JSON 字符串
      try {
        recommendation = JSON.parse(data.result);
      } catch {
        // 如果不是 JSON，尝试从文本中提取信息
        console.warn('Response is not valid JSON, using fallback');
        recommendation = parseFallbackResponse(data.result);
      }
    } else {
      throw new Error('No result in response');
    }

    // 验证返回的数据
    if (!recommendation.mood || !recommendation.genre || !recommendation.suggestedTrack) {
      throw new Error('Invalid response format');
    }

    return recommendation;

  } catch (error) {
    console.error("Error analyzing drawing:", error);
    
    // Fallback 响应
    return {
      mood: "Static Noise",
      genre: "Tape Loop",
      suggestedTrack: "Untitled Track 4",
      reasoning: error instanceof Error 
        ? `Connection lost: ${error.message}` 
        : "The signal is weak, but the tape is still spinning...",
      tempo: "Medium"
    };
  }
};

// 辅助函数：从非结构化文本中提取信息
function parseFallbackResponse(text: string): MusicRecommendation {
  try {
    // 尝试从 Markdown 代码块中提取 JSON
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || 
                     text.match(/```\s*([\s\S]*?)\s*```/);
    
    if (jsonMatch) {
      return JSON.parse(jsonMatch[1]);
    }
    
    // 如果没有代码块，尝试直接解析
    const parsed = JSON.parse(text);
    return parsed;
  } catch {
    // 完全失败，返回基本的 fallback
    return {
      mood: "Analog Warmth",
      genre: "Lo-fi Hip Hop",
      suggestedTrack: "Tape Hiss & Chill",
      reasoning: "Sometimes the imperfections make the best tracks.",
      tempo: "Slow"
    };
  }
}