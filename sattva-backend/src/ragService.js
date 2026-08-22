const { Source } = require("./models");
const { generateEmbedding } = require("./services");
const { unavailable } = require("./utils");
async function searchSources(query) {
  try {
    const vector = await generateEmbedding(query);
    const docs = await Source.aggregate([
      {
        $vectorSearch: {
          index: "source_vector_index",
          path: "embedding",
          queryVector: vector,
          numCandidates: 100,
          limit: 5,
        },
      },
      {
        $project: {
          title: 1,
          url: 1,
          publisher: 1,
          publishedAt: 1,
          credibility: 1,
          score: { $meta: "vectorSearchScore" },
        },
      },
    ]);
    return {
      available: true,
      sources: docs.map((d) => ({
        ...d.toObject(),
        relevance: Math.round(d.score * 100),
      })),
    };
  } catch (error) {
    if (String(error.message).match(/index|vectorSearch|vector search/i))
      return unavailable("VECTOR_INDEX_NOT_READY");
    return unavailable(error.code || "RAG_UNAVAILABLE");
  }
}
module.exports = { searchSources };
