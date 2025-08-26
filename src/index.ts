import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "15mb" }));

await mongoose.connect(process.env.MONGODB_ATLAS_URI!, {
  dbName: process.env.MONGODB_DB,
});
console.log("✅ MongoDB connected");

app.get("/health", (_req, res) => res.json({ ok: true }));

import ingest from "./routes/ingest.js";
import ask from "./routes/ask.js";
import stream from "./routes/stream.js";

app.use("/ingest", ingest); // add text/docs into vector store
app.use("/ask", ask); // non-stream RAG answer
app.use("/stream", stream); // streaming RAG answer (SSE)

app.listen(process.env.PORT || 4000, () =>
  console.log(`🚀 Server running on port ${process.env.PORT || 4000}`)
);
