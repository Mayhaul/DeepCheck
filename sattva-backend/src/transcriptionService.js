const axios = require("axios"),
  OpenAI = require("openai");
const { toFile } = require("openai");
const { unavailable } = require("./utils");
async function transcribeMedia(fileUrl) {
  if (!fileUrl) return unavailable("NO_AUDIO_AVAILABLE");
  if (!process.env.OPENAI_API_KEY) return unavailable("OPENAI_NOT_CONFIGURED");
  try {
    const media = await axios.get(fileUrl, {
      responseType: "arraybuffer",
      timeout: 30000,
    });
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const file = await toFile(Buffer.from(media.data), "submission-media");
    const result = await client.audio.transcriptions.create({
      file,
      model: "gpt-4o-mini-transcribe",
      response_format: "verbose_json",
    });
    return {
      available: true,
      text: result.text || "",
      segments: (result.segments || []).map((x) => ({
        start: x.start,
        end: x.end,
        text: x.text,
      })),
    };
  } catch {
    return unavailable("TRANSCRIPTION_UNAVAILABLE");
  }
}
module.exports = { transcribeMedia };
