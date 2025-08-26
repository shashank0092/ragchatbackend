// src/lib/vector.ts
import "dotenv/config";
import { MongoClient } from "mongodb";
import { MongoDBAtlasVectorSearch } from "@langchain/community/vectorstores/mongodb_atlas";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";

// module-level singleton
let client: MongoClient | null = null;
let clientPromise: Promise<MongoClient> | null = null;

async function getClient(): Promise<MongoClient> {
  if (client) return client;
  if (!clientPromise) {
    const uri = process.env.MONGODB_ATLAS_URI;
    if (!uri) throw new Error("MONGODB_ATLAS_URI is missing in .env");
    if (!uri.startsWith("mongodb")) {
      throw new Error(
        "MONGODB_ATLAS_URI must start with mongodb+srv:// or mongodb://"
      );
    }
    const c = new MongoClient(uri);
    clientPromise = c.connect().then(() => {
      client = c;
      return c;
    });
  }
  return clientPromise;
}

export async function getVectorStore() {
  const dbName = process.env.MONGODB_DB || "rag_chat";
  const collectionName = process.env.MONGODB_COLLECTION || "chunks";
  const indexName = process.env.ATLAS_VECTOR_INDEX || "vector_index";

  const c = await getClient();
  const db = c.db(dbName);
  const collection = db.collection(collectionName);

  const embeddings = new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY!,
    model: "text-embedding-004", // 1536 dims
  });

  const store = new MongoDBAtlasVectorSearch(embeddings, {
    collection,
    indexName,
    textKey: "text",
    embeddingKey: "embedding",
  });

  return { store, collection, embeddings };
}
