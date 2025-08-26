import { Router } from "express";
import { getVectorStore } from "../lib/vector.js";
import { getChatModel } from "../lib/llm.js";
import { PromptTemplate } from "@langchain/core/prompts";
import { RunnableSequence } from "@langchain/core/runnables";

const r = Router();

/**
 * POST /ask
 * body: { question: string, k?: number }
 * - Embed question, retrieve top-k chunks, prompt Gemini with grounded context
 */
r.post("/", async (req, res) => {
  try {
    const { question, k = 5 } = req.body || {};
    if (!question?.trim())
      return res.status(400).json({ error: "No question" });

    const { store } = await getVectorStore();
    const retriever = store.asRetriever(k);

    const template = `You are a helpful AI tutor. Use ONLY the provided CONTEXT to answer.
If answer is not in context, say: "Not in my context."
Return a concise answer and cite chunk ids like [1][2].

CONTEXT:
{context}

QUESTION: {question}
`;
    const prompt = PromptTemplate.fromTemplate(template);

    // Runnable chain:
    // 1) Build context by retrieving docs
    // 2) Format prompt
    // 3) Call chat model
    const chain = RunnableSequence.from([
      {
        context: async (input: any) => {
          const docs = await retriever.getRelevantDocuments(input.question);
          (input as any).__docs = docs; // stash for sources
          return docs.map((d, i) => `[${i + 1}] ${d.pageContent}`).join("\n\n");
        },
        question: (input: any) => input.question,
      },
      prompt,
      getChatModel(),
    ]);

    const result = await chain.invoke({ question });

    // Pull back sources we stashed
    const docs = (result as any).__docs || [];
    const sources = docs.map((d: any, i: number) => ({
      idx: i + 1,
      source: d.metadata?.docId ?? "doc",
    }));

    res.json({ answer: String(result?.content ?? result), sources });
  } catch (e: any) {
    console.error("ASK ERROR:", e);
    res.status(500).json({ error: e.message });
  }
});

export default r;
