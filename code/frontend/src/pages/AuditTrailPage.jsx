import { useState, useEffect } from "react";
import { getAuditLogs } from "../utils/api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { C } from "../utils/constants.js";
import { Icons } from "../utils/components.jsx";
import "./AuditTrailPage.css";

export default function AuditTrailPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  // Filters
  const [category, setCategory] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [searchText, setSearchText] = useState("");

  // Pagination
  const [skip, setSkip] = useState(0);
  const LIMIT = 25;
  const [hasMore, setHasMore] = useState(true);

  // Fetch logs helper
  const fetchLogs = async (reset = false) => {
    const currentSkip = reset ? 0 : skip;
    if (reset) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }
    setError("");

    try {
      const params = {
        skip: currentSkip,
        limit: LIMIT,
      };

      // Map categories to action query filters if not ALL
      if (category !== "ALL") {
        params.action = category;
      }
      if (fromDate) {
        // Convert to ISO string at start of day
        params.from_date = new Date(fromDate).toISOString();
      }
      if (toDate) {
        // Convert to ISO string at end of day
        const endOfDay = new Date(toDate);
        endOfDay.setHours(23, 59, 59, 999);
        params.to_date = endOfDay.toISOString();
      }

      const newLogs = await getAuditLogs(params);
      
      if (reset) {
        setLogs(newLogs);
      } else {
        setLogs(prev => [...prev, ...newLogs]);
      }

      // If we returned fewer than LIMIT, we've reached the end
      if (newLogs.length < LIMIT) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }
      
      setSkip(currentSkip + LIMIT);
    } catch (err) {
      setError(err.message || "Failed to load audit logs");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Re-fetch when category, fromDate, or toDate changes
  useEffect(() => {
    setSkip(0);
    fetchLogs(true);
  }, [category, fromDate, toDate]);

  const handleLoadMore = () => {
    fetchLogs(false);
  };

  // Filter logs locally based on search text (searches email, summary, action, entity_id)
  const filteredLogs = logs.filter(log => {
    if (!searchText) return true;
    const term = searchText.toLowerCase();
    return (
      (log.summary && log.summary.toLowerCase().includes(term)) ||
      (log.action && log.action.toLowerCase().includes(term)) ||
      (log.user_email && log.user_email.toLowerCase().includes(term)) ||
      (log.entity_id && log.entity_id.toLowerCase().includes(term))
    );
  });

  const getActionBadgeStyle = (action) => {
    if (action.includes("FAIL") || action.includes("ERR")) {
      return { bg: "#FEF2F2", text: "#EF4444", border: "rgba(239, 68, 68, 0.2)" };
    }
    if (action.includes("CREATE") || action.includes("REGISTER") || action.includes("UPLOAD")) {
      return { bg: "#ECFDF5", text: "#10B981", border: "rgba(16, 185, 129, 0.2)" };
    }
    if (action.includes("SUCCESS") || action.includes("LOGIN")) {
      return { bg: "#E8F4FD", text: "#0077B6", border: "rgba(0, 119, 182, 0.2)" };
    }
    return { bg: "#F4F7FB", text: "#64748B", border: "#E2E8F0" };
  };

  const getStatusBadgeStyle = (status) => {
    const isSuccess = status === "success";
    return {
      bg: isSuccess ? "#ECFDF5" : "#FEF2F2",
      text: isSuccess ? "#10B981" : "#EF4444",
      dot: isSuccess ? "#10B981" : "#EF4444"
    };
  };

  return (
    <div className="audit-page fade-in">
      {/* 1. Header Role Information card */}
      <div className="audit-role-card">
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div className="role-badge-icon">🛡️</div>
          <div>
            <div className="audit-role-title">Clinician Profile: {user?.specialty || "General Dentist"}</div>
            <div className="audit-role-desc">
              Audit trails are append-only. Showing active log entries associated with your account.
            </div>
          </div>
        </div>
        <div className="audit-role-status">
          <span className="badge" style={{ background: "#F1F5F9", color: "#64748B" }}>
            <span className="badge-dot" style={{ background: "#94A3B8" }} />
            Read Only Access
          </span>
        </div>
      </div>

      {/* 2. Filters & Searches */}
      <div className="audit-filters-bar">
        <div className="filter-group">
          <div className="filter-item">
            <label className="filter-label">Category</label>
            <select
              className="filter-select"
              value={category}
              onChange={e => setCategory(e.target.value)}
            >
              <option value="ALL">All Categories</option>
              <option value="LOGIN">Auth & Sessions</option>
              <option value="PATIENT">Patients</option>
              <option value="VISIT">Visits</option>
              <option value="SCAN">Scan Uploads</option>
              <option value="LANDMARK">AI Landmarking</option>
              <option value="PAR">Calculations & Scores</option>
              <option value="REPORT">Report Views</option>
              <option value="MODEL">Model Uploads</option>
            </select>
          </div>

          <div className="filter-item">
            <label className="filter-label">From Date</label>
            <input
              type="date"
              className="filter-date"
              value={fromDate}
              onChange={e => setFromDate(e.target.value)}
            />
          </div>

          <div className="filter-item">
            <label className="filter-label">To Date</label>
            <input
              type="date"
              className="filter-date"
              value={toDate}
              onChange={e => setToDate(e.target.value)}
            />
          </div>
        </div>

        <div className="search-wrap" style={{ minWidth: 260 }}>
          <span className="search-icon">{Icons.search}</span>
          <input
            className="search-input"
            style={{ width: "100%", height: 38 }}
            placeholder="Search logs by keyword..."
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
          />
        </div>
      </div>

      {/* 3. Tabular Log structure */}
      <div className="table-card">
        {error && (
          <div style={{ padding: "16px 20px", color: C.red, background: "#FEF2F2", fontSize: 13, fontWeight: 500 }}>
            ⚠ {error}
          </div>
        )}

        <div className="audit-table-header">
          <div>Timestamp (UTC)</div>
          <div>Action</div>
          <div>Entity</div>
          <div>Status</div>
          <div>Summary Description</div>
          <div style={{ textAlign: "center" }}>Details</div>
        </div>

        {loading ? (
          <div className="audit-loading-row">
            <span className="processing" /> Loading secure logs…
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="audit-empty-row">
            No audit records match the selected filters.
          </div>
        ) : (
          filteredLogs.map(log => {
            const isExpanded = expandedId === log.id;
            const ab = getActionBadgeStyle(log.action);
            const sb = getStatusBadgeStyle(log.status);
            
            return (
              <div key={log.id} className="audit-row-wrapper">
                <div 
                  className={`audit-table-row ${isExpanded ? "active" : ""}`}
                  onClick={() => setExpandedId(isExpanded ? null : log.id)}
                >
                  <div className="audit-time">
                    {new Date(log.timestamp).toLocaleString("en-US", { timeZone: "UTC" })}
                  </div>
                  <div>
                    <span 
                      className="audit-action-badge" 
                      style={{ background: ab.bg, color: ab.text, borderColor: ab.border }}
                    >
                      {log.action}
                    </span>
                  </div>
                  <div className="audit-entity">
                    {log.entity_type ? (
                      <span className="entity-pill">
                        {log.entity_type}
                        {log.entity_id && (
                          <span className="entity-id-tag">
                            #{log.entity_id.split("-")[0]}
                          </span>
                        )}
                      </span>
                    ) : (
                      "—"
                    )}
                  </div>
                  <div>
                    <span className="badge" style={{ background: sb.bg, color: sb.text }}>
                      <span className="badge-dot" style={{ background: sb.dot }} />
                      {log.status}
                    </span>
                  </div>
                  <div className="audit-summary">
                    {log.summary || "No description provided."}
                  </div>
                  <div style={{ textAlign: "center" }}>
                    <button className={`audit-toggle-btn ${isExpanded ? "rotated" : ""}`}>
                      ▼
                    </button>
                  </div>
                </div>

                {/* Details Accordion Panel */}
                {isExpanded && (
                  <div className="audit-details-panel">
                    <div className="details-grid">
                      {/* Clinical Metadata parameters */}
                      <div style={{ gridColumn: "span 3" }}>
                        <div className="details-label" style={{ marginBottom: 10 }}>Activity Parameters</div>
                        {log.details ? (
                          <div className="activity-params-grid">
                            {Object.entries(log.details).map(([key, val]) => {
                              // Make keys human readable (e.g. patient_id -> Patient ID)
                              const label = key
                                .split("_")
                                .map(w => w.charAt(0).toUpperCase() + w.slice(1))
                                .join(" ");
                              return (
                                <div key={key} className="param-item">
                                  <span className="param-key">{label}:</span>
                                  <span className="param-value font-mono">
                                    {typeof val === "object" ? JSON.stringify(val) : String(val)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="details-value" style={{ color: "#94A3B8", fontStyle: "italic" }}>
                            No parameters associated with this action.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* 4. Pagination / Load more */}
      {hasMore && !loading && (
        <div style={{ textAlign: "center", marginTop: 20, marginBottom: 20 }}>
          <button 
            className="btn-secondary" 
            style={{ width: "auto", padding: "8px 24px" }}
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading more..." : "Load More Audits"}
          </button>
        </div>
      )}
    </div>
  );
}
