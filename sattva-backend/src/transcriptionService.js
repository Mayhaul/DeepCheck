const axios = require("axios");
const { GoogleGenAI, createUserContent, createPartFromBase64 } = require("@google/genai");
const { unavailable } = require("./utils");

function getGeminiClient() {
  if (!process.env.GEMINI_API_KEY) {
    throw Object.assign(
      new Error("GEMINI_API_KEY is required for transcription"),
      { code: "GEMINI_NOT_CONFIGURED" },
    );
  }
  return new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
}

async function transcribeMedia(fileUrl) {
  if (!fileUrl) return unavailable("NO_AUDIO_AVAILABLE");
  try {
    const media = await axios.get(fileUrl, {
      responseType: "arraybuffer",
      timeout: 30000,
    });

    const mimeType = media.headers["content-type"] || "audio/mpeg";
    const base64Audio = Buffer.from(media.data).toString("base64");
    const ai = getGeminiClient();

    const prompt = `Transcribe this audio accurately. Return JSON only with one field named \"text\" containing the full transcription.`;
    const result = await ai.models.generateContent({
      model: "gemini-3.7-flash",
      contents: createUserContent([
        prompt,
        createPartFromBase64(base64Audio, mimeType),
      ]),
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "object",
          properties: {
            text: { type: "string" },
          },
          required: ["text"],
        },
      },
    });

    const parsed = JSON.parse(result.text);
    return {
      available: true,
      text: parsed.text || "",
      segments: [],
    };
  } catch {
    return unavailable("TRANSCRIPTION_UNAVAILABLE");
  }
}

module.exports = { transcribeMedia };
