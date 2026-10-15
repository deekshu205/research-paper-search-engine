import express from "express";
import { MongoClient } from "mongodb";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 5000;
const MONGO_URI = "mongodb://localhost:27017";
const DB_NAME = "research_engine";

let db, papersCollection;

// Connect to MongoDB
MongoClient.connect(MONGO_URI)
  .then((client) => {
    db = client.db(DB_NAME);
    papersCollection = db.collection("papers");
    console.log(`Connected to MongoDB: ${DB_NAME}`);
  })
  .catch((err) => console.error("Database connection failed:", err));

// 1. Search Route: Handles searching, sorting by score, and category filters
app.get("/api/search", async (req, res) => {
  try {
    const { q, category, page = 1, limit = 10 } = req.query;
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter = {};

    // Match text if user typed a search word
    if (q && q.trim() !== "") {
      filter.$text = {$search: q };
    }

    // Filter by specific category if selected
    if (category && category !== "All") {
      filter.categories = category;
    }

    const projection = {
      title: 1,
      abstract: 1,
      authors: 1,
      categories: 1,
      primary_category: 1,
      update_date: 1,
      pdf_url: 1
    };

    let cursor = papersCollection.find(filter);

    // If text query exists, sort by MongoDB textScore; otherwise by date
    if (filter.$text) {
      projection.score = { $meta: "textScore" };
      cursor = cursor.project(projection).sort({ score: { $meta: "textScore" } });
    } else {
      cursor = cursor.project(projection).sort({ update_date: -1 });
    }

    const totalResults = await papersCollection.countDocuments(filter);
    const results = await cursor.skip(skip).limit(limitNum).toArray();

    res.json({
      total: totalResults,
      page: pageNum,
      totalPages: Math.ceil(totalResults / limitNum),
      results
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ error: "Search failed" });
  }
});

// 2. Facets Route: Calculates category count distribution for sidebar filters
app.get("/api/facets", async (req, res) => {
  try {
    const { q } = req.query;
    const matchStage = q && q.trim() !== "" ? { $match: {$text: { $search: q } } } : {$match: {} };

    const facetData = await papersCollection.aggregate([
      matchStage,
      {
        $facet: {
          categories: [
            { $unwind: "$categories" },
            { $sortByCount: "$categories" },
            { $limit: 8 }
          ],
          topAuthors: [
            { $unwind: "$authors" },
            { $sortByCount: "$authors" },
            { $limit: 6 }
          ]
        }
      }
    ]).toArray();

    res.json(facetData[0]);
  } catch (error) {
    console.error("Facet error:", error);
    res.status(500).json({ error: "Failed to fetch facets" });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});