import { Router } from "express";
import { getVectorStore } from "../lib/vector.js";
import { getChatModel } from "../lib/llm.js";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";

/**
 * GET /stream?q=your+question
 * - Same RAG pipeline but stream tokens to client via Server-Sent Events
 */
const r = Router();

r.get("/", async (req, res) => {
  try {
    const question = String(req.query.q || "");
    if (!question.trim()) {
      res.status(400).end();
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.flushHeaders?.();

    const { store } = await getVectorStore();
    const retriever = store.asRetriever(5);

    const template = `Use ONLY the CONTEXT to answer. If missing, say: "Not in my context."

CONTEXT:
{context}

Q: {question}
`;
    const prompt = PromptTemplate.fromTemplate(template);

    const chain = RunnableSequence.from([
      {
        context: async (input: any) => {
          const docs = await retriever.getRelevantDocuments(input.question);
          return docs.map((d, i) => `[${i + 1}] ${d.pageContent}`).join("\n\n");
        },
        question: (input: any) => input.question,
      },
      prompt,
      getChatModel(),
    ]);

    const stream = await chain.stream({ question });

    for await (const chunk of stream as any) {
      const token = typeof chunk === "string" ? chunk : chunk?.content ?? "";
      if (token) res.write(`data: ${JSON.stringify({ token })}\n\n`);
    }

    res.write(`event: done\ndata: {}\n\n`);
    res.end();
  } catch (e: any) {
    res.write(
      `event: error\ndata: ${JSON.stringify({ error: e.message })}\n\n`
    );
    res.end();
  }
});

export default r;
