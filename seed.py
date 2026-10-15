import json
import re
from pymongo import MongoClient

# Connect to MongoDB
client = MongoClient("mongodb://localhost:27017/")
db = client["research_engine"]
collection = db["papers"]

# Clear any previous run
collection.drop()

def clean_text(text):
    if not text:
        return ""
    # Remove newlines and excess whitespace
    text = re.sub(r'\s+', ' ', text)
    # Remove inline LaTeX math markers: $...$
    text = re.sub(r'\$[^$]*\$', '', text)
    # Remove common LaTeX commands (e.g., \alpha, \frac, \mathbb)
    text = re.sub(r'\\[a-zA-Z]+', '', text)
    # Clean up isolated braces/brackets
    text = re.sub(r'[{}\\]', '', text)
    return text.strip()

TARGET_COUNT = 10000
batch = []
count = 0

print("Parsing dataset and cleaning LaTeX...")

with open("arxiv-metadata-oai-snapshot.json", "r", encoding="utf-8") as f:
    for line in f:
        item = json.loads(line)
        categories = item.get("categories", "").split()

        # Target Computer Science papers (cs.AI, cs.LG, cs.CV, cs.CL, etc.)
        if any(cat.startswith("cs.") for cat in categories):
            doc = {
                "arxiv_id": item.get("id"),
                "title": clean_text(item.get("title", "")),
                "abstract": clean_text(item.get("abstract", "")),
                "authors": [a.strip() for a in item.get("authors", "").split(",") if a.strip()][:5],
                "categories": categories,
                "primary_category": categories[0] if categories else "cs.AI",
                "update_date": item.get("update_date"),
                "doi": item.get("doi"),
                "pdf_url": f"https://arxiv.org/pdf/{item.get('id')}.pdf"
            }
            batch.append(doc)
            count += 1

            if len(batch) >= 1000:
                collection.insert_many(batch)
                batch = []
                print(f"Cleaned & inserted: {count}/{TARGET_COUNT} papers...")

            if count >= TARGET_COUNT:
                break

if batch:
    collection.insert_many(batch)

print(f"\nCompleted! Total documents loaded: {collection.count_documents({})}")