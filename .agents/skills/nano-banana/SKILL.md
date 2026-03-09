# Stitch MCP Skill

---

name: nano-banana
description: Generate images using Google's Nano Banana 2 (Gemini 3.1 Flash Image) API. Use when asked to create, generate, or edit images for the project.

---

# Nano Banana 2 Image Generation

## API Endpoint

POST https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=AIzaSyC0a34shBJ6-coBTm1Ok4E7beO4jnza2tg

Replace AIzaSyC0a34shBJ6-coBTm1Ok4E7beO4jnza2tg with your actual key.

## Generate an image from text

```bash
curl -s -X POST \
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-image-preview:generateContent?key=AIzaSyC0a34shBJ6-coBTm1Ok4E7beO4jnza2tg" \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{"parts": [{"text": "YOUR_PROMPT_HERE"}]}],
    "generationConfig": {"responseModalities": ["TEXT", "IMAGE"]}
  }' | node -e "
    const data=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));
    const img=data.candidates?.[0]?.content?.parts?.find(p=>p.inlineData);
    if(img){
      require('fs').writeFileSync('output.png',Buffer.from(img.inlineData.data,'base64'));
      console.log('Saved: output.png');
    } else { console.log('No image in response'); }
  "
```

## Best practices for prompts

- Be specific about style: "photorealistic", "3D render", "flat illustration", "icon style"
- Specify dimensions context: "square icon", "wide banner", "portrait"
- For app assets: "dark background, minimal, modern, purple accent color"
- For icons: "simple, clean, white on transparent background"
