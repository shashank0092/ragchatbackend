import { Router } from "express";
import { chunkText } from "../lib/chunk.js";
import { getVectorStore } from "../lib/vector.js";

const r = Router();

/**
 * POST /ingest
 * body: { docId?: string, text: string }
 * - Splits text into chunks
 * - Embeds via Gemini
 * - Stores into Mongo Atlas Vector Store
 */
r.post("/", async (req, res) => {
  try {
    const { docId = "doc1", text } = req.body || {};
    if (!text?.trim())
      return res.status(400).json({ error: "No text provided" });

    const { store, collection } = await getVectorStore();

    const chunks = chunkText(text);
    // VectorStore expects array of Documents: { pageContent, metadata }
    const docs = chunks.map((c, i) => ({
      pageContent: c,
      metadata: { docId, chunkId: `${docId}-${i}` },
    }));

    await store.addDocuments(docs);
    // Helpful for filtering later
    await collection.createIndex({ "metadata.docId": 1 });

    res.json({ ok: true, stored: docs.length });
  } catch (e: any) {
    console.error("INGEST ERROR:", e);
    res.status(500).json({ error: e.message });
  }
});

export default r;
