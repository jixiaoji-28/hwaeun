// api/gemini.js
export default async function handler(req, res) {
  // ✨ 最简单有效的 CORS 配置
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // OPTIONS 预检
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const API_KEY = process.env.GEMINI_API_KEY;
    
    if (!API_KEY) {
      console.error('❌ API key missing');
      return res.status(500).json({ error: 'API key not configured' });
    }

    const { imageBase64, prompt } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data required' });
    }

    console.log('📡 Calling Gemini API...');

    const cleanBase64 = imageBase64.replace(/^data:image\/(png|jpg|jpeg);base64,/, '');

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
            responseMimeType: "application/json",
            responseSchema: {
              type: "object",
              properties: {
                mood: { type: "string" },
                genre: { type: "string" },
                suggestedTrack: { type: "string" },
                reasoning: { type: "string" },
                tempo: { type: "string" }
              },
              required: ["mood", "genre", "suggestedTrack", "reasoning", "tempo"]
            }
          }
        })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Gemini error:', errorText);
      return res.status(500).json({ error: 'Gemini API failed' });
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      return res.status(500).json({ error: 'No response from Gemini' });
    }

    console.log('✅ Success!');
    return res.status(200).json({ result: text });
    
  } catch (error) {
    console.error('❌ Error:', error);
    return res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
}