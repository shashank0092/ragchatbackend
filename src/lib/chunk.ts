/**
 * Split text into overlapping chunks (word-based) so retrieval preserves context.
 * max ~ words per chunk, overlap for continuity between chunks.
 */
export function chunkText(text: string, max = 800, overlap = 100) {
  const words = text.split(/\s+/);
  const out: string[] = [];
  for (let i = 0; i < words.length; i += max - overlap) {
    out.push(words.slice(i, i + max).join(" "));
  }
  return out;
}
