import React, { useState, useEffect } from "react";
import "./App.css";

export default function App() {
  const [query, setQuery] = useState("neural");
  const [category, setCategory] = useState("All");
  const [results, setResults] = useState([]);
  const [facets, setFacets] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);

  // Fetch search results
  const fetchResults = async () => {
    setLoading(true);
    try {
      const catParam = category !== "All" ? `&category=${encodeURIComponent(category)}` : "";
      const res = await fetch(
        `http://localhost:5000/api/search?q=${encodeURIComponent(query)}${catParam}&page=${page}&limit=10`
      );
      const data = await res.json();
      setResults(data.results || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch (err) {
      console.error("Fetch search failed", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch facet categories for the sidebar
  const fetchFacets = async () => {
    try {
      const res = await fetch(`http://localhost:5000/api/facets?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setFacets(data.categories || []);
    } catch (err) {
      console.error("Fetch facets failed", err);
    }
  };

  useEffect(() => {
    fetchResults();
    fetchFacets();
  }, [category, page]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    fetchResults();
    fetchFacets();
  };

  return (
    <div className="container">
      <div className="header">
        <h1>ResearchLens</h1>
        <p>MongoDB Text Engine across 10,000 Computer Science Publications</p>
      </div>

      <form className="search-box" onSubmit={handleSearch}>
        <input
          type="text"
          className="search-input"
          placeholder="Search topics (e.g., neural networks, transformers, vision, encryption)..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button type="submit" className="search-btn">Search</button>
      </form>

      <div className="layout">
        {/* Left Sidebar: Dynamic Facets */}
        <aside className="sidebar">
          <h3>Filter by Field</h3>
          <div
            className={`facet-item ${category === "All" ? "active" : ""}`}
            onClick={() => { setCategory("All"); setPage(1); }}
          >
            <span>All Categories</span>
          </div>
          {facets.map((f) => (
            <div
              key={f._id}
              className={`facet-item ${category === f._id ? "active" : ""}`}
              onClick={() => { setCategory(f._id); setPage(1); }}
            >
              <span>{f._id}</span>
              <span className="facet-count">{f.count}</span>
            </div>
          ))}
        </aside>

        {/* Right Main Column: Paper Cards */}
        <main>
          <div style={{ marginBottom: "1rem", color: "#64748b" }}>
            Showing {results.length} of {total} indexed papers
          </div>

          {loading ? (
            <p>Running query against MongoDB...</p>
          ) : results.length === 0 ? (
            <p>No papers matched this query.</p>
          ) : (
            <div className="results-list">
              {results.map((paper) => (
                <article key={paper._id} className="paper-card">
                  <div className="card-header">
                    <a
                      href={paper.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="paper-title"
                    >
                      {paper.title}
                    </a>
                    {paper.score && (
                      <span className="score-badge">
                        Score: {paper.score.toFixed(2)}
                      </span>
                    )}
                  </div>

                  <div className="authors">
                    {paper.authors && paper.authors.join(", ")} &bull; {paper.update_date}
                  </div>

                  <p className="abstract">
                    {paper.abstract?.slice(0, 240)}...
                  </p>

                  <div className="card-footer">
                    <div className="tags">
                      {paper.categories?.map((cat) => (
                        <span key={cat} className="tag">{cat}</span>
                      ))}
                    </div>
                    <a
                      href={paper.pdf_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="pdf-link"
                    >
                      View PDF &rarr;
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}

          {/* Pagination */}
          <div className="pagination">
            <button
              className="page-btn"
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
            >
              Previous
            </button>
            <span>Page {page} of {totalPages}</span>
            <button
              className="page-btn"
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
            >
              Next
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}