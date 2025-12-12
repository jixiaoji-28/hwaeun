// api/gemini.js
export default async function handler(req, res) {
  // CORS 配置
  const allowedOrigins = [
    'https://jixiaoji-28.github.io',
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:4173'
  ];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // 预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const API_KEY = process.env.GEMINI_API_KEY;
    
    if (!API_KEY) {
      console.error('❌ GEMINI_API_KEY not found in environment variables');
      return res.status(500).json({ error: 'API key not configured' });
    }

    const { imageBase64, prompt } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data required' });
    }

    console.log('📡 Calling Gemini API with structured output...');

    // 清理 base64 数据
    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpg|jpeg);base64,/, '');

    // 使用 Gemini 2.0 Flash 的结构化输出
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              {
                inline_data: {
                  mime_type: 'image/jpeg',
                  data: cleanBase64
                }
              },
              { text: prompt }
            ]
          }],
          generationConfig: {
            temperature: 0.8,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                mood: {
                  type: "string",
                  description: "The emotional mood of the drawing"
                },
                genre: {
                  type: "string",
                  description: "A suitable retro/vintage music genre"
                },
                suggestedTrack: {
                  type: "string",
                  description: "A creative, imaginary track title"
                },
                reasoning: {
                  type: "string",
                  description: "Why this music fits the drawing"
                },
                tempo: {
                  type: "string",
                  description: "Suggested tempo: Slow, Medium, or Fast"
                }
              },
              required: ["mood", "genre", "suggestedTrack", "reasoning", "tempo"]
            }
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini API error:', errorText);
      return res.status(response.status).json({ 
        error: 'Gemini API request failed',
        details: errorText.substring(0, 200)
      });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      console.error('❌ No text in Gemini response');
      return res.status(500).json({ error: 'No response from Gemini' });
    }

    console.log('✅ Analysis complete!');
    
    // 返回结构化的 JSON
    return res.status(200).json({ result: text });
    
  } catch (error) {
    console.error('❌ Server Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}