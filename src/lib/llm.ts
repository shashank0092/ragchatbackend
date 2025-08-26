import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

/**
 * Returns a configured Gemini chat model for answers.
 * Use gemini-2.5-flash (fast, cheap) or gemini-1.5-pro (slower, more accurate).
 */
export function getChatModel() {
  return new ChatGoogleGenerativeAI({
    apiKey: process.env.GEMINI_API_KEY!,
    model: "gemini-2.5-flash",
    temperature: 0.2, // stable answers
  });
}
