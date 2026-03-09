import { useState, useEffect, useRef, useCallback } from "react";

// ── Utility ────────────────────────────────────────────────────────────────
const uid = () => Math.random().toString(36).slice(2, 9);
const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const nowFull = () => new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

const PRIORITY = {
  critical: { label: "CRITICAL", color: "#ff2d55", bg: "rgba(255,45,85,0.12)" },
  high:     { label: "HIGH",     color: "#ff9f0a", bg: "rgba(255,159,10,0.12)" },
  medium:   { label: "MED",      color: "#30d158", bg: "rgba(48,209,88,0.12)"  },
  low:      { label: "LOW",      color: "#636366", bg: "rgba(99,99,102,0.12)"  },
};

const TAG_COLORS = ["#0a84ff","#bf5af2","#ff375f","#ff9f0a","#30d158","#5ac8fa","#ff2d55","#34c759"];

const INITIAL_BOARD = {
  columns: [
    { id: "backlog",  title: "BACKLOG",     color: "#636366", limit: null },
    { id: "todo",     title: "TO DO",       color: "#0a84ff", limit: 6 },
    { id: "progress", title: "IN PROGRESS", color: "#ff9f0a", limit: 3 },
    { id: "review",   title: "REVIEW",      color: "#bf5af2", limit: 4 },
    { id: "done",     title: "DONE",        color: "#30d158", limit: null },
  ],
  tasks: [
    { id: uid(), colId: "backlog",  title: "Redesign onboarding flow",        desc: "Improve first-time user experience with guided steps.", priority: "high",     tags: ["UX","Design"],      comments: [], attachments: 2, createdAt: nowFull(), dueDate: "Mar 20" },
    { id: uid(), colId: "backlog",  title: "API rate-limiting middleware",     desc: "Implement token-bucket algorithm for REST endpoints.",  priority: "medium",   tags: ["Backend"],          comments: [], attachments: 0, createdAt: nowFull(), dueDate: null },
    { id: uid(), colId: "todo",     title: "Integrate Stripe payments",        desc: "Add subscription billing with webhook support.",        priority: "critical", tags: ["Backend","Billing"], comments: [], attachments: 1, createdAt: nowFull(), dueDate: "Mar 15" },
    { id: uid(), colId: "todo",     title: "Dark mode toggle",                 desc: "Persist user preference in localStorage.",             priority: "low",      tags: ["Frontend"],         comments: [], attachments: 0, createdAt: nowFull(), dueDate: null },
    { id: uid(), colId: "progress", title: "Build CI/CD pipeline",             desc: "GitHub Actions → Docker → Kubernetes deploy.",         priority: "high",     tags: ["DevOps"],           comments: [], attachments: 3, createdAt: nowFull(), dueDate: "Mar 12" },
    { id: uid(), colId: "review",   title: "Write unit tests for auth module", desc: "Coverage target ≥ 85% for login / JWT flows.",          priority: "medium",   tags: ["Testing","Auth"],   comments: [], attachments: 0, createdAt: nowFull(), dueDate: "Mar 11" },
    { id: uid(), colId: "done",     title: "Set up monorepo with Turborepo",   desc: "Shared packages: ui, utils, config.",                  priority: "low",      tags: ["DevOps"],           comments: [], attachments: 0, createdAt: nowFull(), dueDate: null },
  ],
};

// ── Storage ────────────────────────────────────────────────────────────────
const STORAGE_KEY = "kanban_board_v3";
const loadBoard   = () => { try { const d = localStorage.getItem(STORAGE_KEY); return d ? JSON.parse(d) : INITIAL_BOARD; } catch { return INITIAL_BOARD; } };
const saveBoard   = (b) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(b)); } catch {} };

// ── Priority Badge ─────────────────────────────────────────────────────────
function PriorityBadge({ priority }) {
  const p = PRIORITY[priority];
  return (
    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.12em", padding: "2px 6px", borderRadius: 3, color: p.color, background: p.bg, fontFamily: "'DM Mono', monospace", border: `1px solid ${p.color}33` }}>
      {p.label}
    </span>
  );
}

// ── Tag ────────────────────────────────────────────────────────────────────
function Tag({ label, index }) {
  const color = TAG_COLORS[index % TAG_COLORS.length];
  return (
    <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 7px", borderRadius: 3, color, background: `${color}18`, fontFamily: "'DM Mono', monospace", letterSpacing: "0.05em" }}>
      {label}
    </span>
  );
}

// ── Task Card ──────────────────────────────────────────────────────────────
function TaskCard({ task, onDragStart, onOpen, colColor }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, task.id)}
      onClick={() => onOpen(task)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: hover ? "#1c1c1e" : "#141414",
        border: `1px solid ${hover ? colColor + "55" : "#2c2c2e"}`,
        borderLeft: `3px solid ${colColor}`,
        borderRadius: 6,
        padding: "12px 14px",
        cursor: "grab",
        transition: "all 0.15s ease",
        transform: hover ? "translateY(-2px)" : "none",
        boxShadow: hover ? `0 8px 24px rgba(0,0,0,0.4), 0 0 0 1px ${colColor}22` : "0 2px 8px rgba(0,0,0,0.3)",
        userSelect: "none",
      }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 8 }}>
        <PriorityBadge priority={task.priority} />
        {task.tags.map((t, i) => <Tag key={t} label={t} index={i} />)}
      </div>

      <p style={{ margin: "0 0 6px", fontSize: 13, fontWeight: 600, lineHeight: 1.4, color: "#f2f2f7", fontFamily: "'Syne', sans-serif", letterSpacing: "-0.01em" }}>
        {task.title}
      </p>

      {task.desc && (
        <p style={{ margin: "0 0 10px", fontSize: 11, color: "#636366", lineHeight: 1.5, fontFamily: "'DM Mono', monospace", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
          {task.desc}
        </p>
      )}

      <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10 }}>
        {task.dueDate && (
          <span style={{ fontSize: 10, color: "#636366", fontFamily: "'DM Mono', monospace", display: "flex", alignItems: "center", gap: 3 }}>
            <span style={{ color: "#ff9f0a" }}>◷</span> {task.dueDate}
          </span>
        )}
        {task.comments.length > 0 && (
          <span style={{ fontSize: 10, color: "#636366", fontFamily: "'DM Mono', monospace" }}>💬 {task.comments.length}</span>
        )}
        {task.attachments > 0 && (
          <span style={{ fontSize: 10, color: "#636366", fontFamily: "'DM Mono', monospace" }}>📎 {task.attachments}</span>
        )}
      </div>
    </div>
  );
}

// ── Column ─────────────────────────────────────────────────────────────────
function Column({ col, tasks, onDragStart, onDrop, onDragOver, onDragLeave, isDragOver, onOpen, onAddTask, onDeleteColumn }) {
  const [hover, setHover] = useState(false);
  const overLimit = col.limit && tasks.length >= col.limit;

  return (
    <div
      style={{ width: 270, flexShrink: 0, display: "flex", flexDirection: "column", gap: 0 }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div style={{ padding: "10px 14px", background: "#0a0a0a", borderRadius: "6px 6px 0 0", border: `1px solid #2c2c2e`, borderBottom: "none", display: "flex", alignItems: "center", gap: 8 }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: col.color, flexShrink: 0, boxShadow: `0 0 6px ${col.color}` }} />
        <span style={{ flex: 1, fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", color: col.color, fontFamily: "'DM Mono', monospace" }}>{col.title}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: overLimit ? "#ff2d55" : "#3a3a3c", fontFamily: "'DM Mono', monospace" }}>
          {tasks.length}{col.limit ? `/${col.limit}` : ""}
        </span>
        {hover && (
          <button onClick={() => onDeleteColumn(col.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#636366", fontSize: 14, padding: 0, lineHeight: 1 }}>×</button>
        )}
      </div>

      <div
        onDrop={e => onDrop(e, col.id)}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        style={{
          flex: 1, minHeight: 120, padding: "10px 8px", display: "flex", flexDirection: "column", gap: 8,
          background: isDragOver ? `${col.color}08` : "#0d0d0d",
          border: `1px solid ${isDragOver ? col.color + "55" : "#2c2c2e"}`,
          borderTop: "none", borderRadius: "0 0 6px 6px",
          transition: "background 0.15s, border-color 0.15s",
          outline: isDragOver ? `1px dashed ${col.color}44` : "none",
          outlineOffset: -4,
        }}
      >
        {tasks.map(task => (
          <TaskCard key={task.id} task={task} onDragStart={onDragStart} onOpen={onOpen} colColor={col.color} />
        ))}
        {tasks.length === 0 && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#2c2c2e", fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em" }}>
            {isDragOver ? "DROP HERE" : "EMPTY"}
          </div>
        )}
      </div>

      <button
        onClick={() => !overLimit && onAddTask(col.id)}
        disabled={overLimit}
        style={{ marginTop: 6, padding: "8px", background: "transparent", border: `1px dashed ${overLimit ? "#2c2c2e" : "#3a3a3c"}`, borderRadius: 6, color: overLimit ? "#2c2c2e" : "#636366", cursor: overLimit ? "not-allowed" : "pointer", fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: "0.08em", transition: "all 0.15s" }}
        onMouseEnter={e => { if (!overLimit) { e.currentTarget.style.borderColor = col.color; e.currentTarget.style.color = col.color; }}}
        onMouseLeave={e => { e.currentTarget.style.borderColor = overLimit ? "#2c2c2e" : "#3a3a3c"; e.currentTarget.style.color = overLimit ? "#2c2c2e" : "#636366"; }}
      >
        {overLimit ? `⚠ WIP LIMIT (${col.limit})` : "+ ADD TASK"}
      </button>
    </div>
  );
}

// ── Tag Adder ──────────────────────────────────────────────────────────────
function TagAdder({ onAdd }) {
  const [editing, setEditing] = useState(false);
  const [val, setVal] = useState("");
  const ref = useRef();
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  return editing ? (
    <input ref={ref} value={val} onChange={e => setVal(e.target.value)}
      onKeyDown={e => { if (e.key === "Enter") { onAdd(val.trim()); setVal(""); setEditing(false); } if (e.key === "Escape") setEditing(false); }}
      onBlur={() => setEditing(false)}
      style={{ background: "#1c1c1e", border: "1px dashed #636366", borderRadius: 4, color: "#f2f2f7", padding: "3px 8px", fontSize: 11, fontFamily: "'DM Mono', monospace", outline: "none", width: 80 }}
    />
  ) : (
    <button onClick={() => setEditing(true)} style={{ background: "none", border: "1px dashed #3a3a3c", borderRadius: 4, color: "#636366", cursor: "pointer", padding: "3px 8px", fontSize: 11, fontFamily: "'DM Mono', monospace" }}>+ TAG</button>
  );
}

// ── Task Modal ─────────────────────────────────────────────────────────────
function TaskModal({ task, columns, onClose, onUpdate, onDelete }) {
  const [t, setT] = useState({ ...task, comments: task.comments || [] });
  const [commentText, setCommentText] = useState("");

  const save = (patch) => {
    const updated = { ...t, ...patch };
    setT(updated);
    onUpdate(updated);
  };

  const addComment = () => {
    if (!commentText.trim()) return;
    const c = { id: uid(), text: commentText.trim(), time: now() };
    save({ comments: [...t.comments, c] });
    setCommentText("");
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#141414", border: "1px solid #2c2c2e", borderRadius: 10, width: "100%", maxWidth: 560, maxHeight: "88vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 32px 80px rgba(0,0,0,0.7)" }}>

        <div style={{ padding: "16px 20px", borderBottom: "1px solid #1c1c1e", display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ flex: 1 }}>
            <input value={t.title} onChange={e => save({ title: e.target.value })}
              style={{ width: "100%", background: "transparent", border: "none", outline: "none", fontSize: 17, fontWeight: 700, color: "#f2f2f7", fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em", padding: 0 }} />
            <p style={{ margin: "4px 0 0", fontSize: 11, color: "#48484a", fontFamily: "'DM Mono', monospace" }}>Created {t.createdAt}</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => { onDelete(t.id); onClose(); }} style={{ background: "rgba(255,45,85,0.1)", border: "1px solid #ff2d5533", borderRadius: 5, color: "#ff2d55", cursor: "pointer", fontSize: 11, padding: "5px 10px", fontFamily: "'DM Mono', monospace" }}>DELETE</button>
            <button onClick={onClose} style={{ background: "#1c1c1e", border: "1px solid #2c2c2e", borderRadius: 5, color: "#8e8e93", cursor: "pointer", fontSize: 16, padding: "4px 10px" }}>×</button>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 10, color: "#48484a", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em" }}>COLUMN</span>
              <select value={t.colId} onChange={e => save({ colId: e.target.value })}
                style={{ background: "#1c1c1e", border: "1px solid #2c2c2e", borderRadius: 5, color: "#f2f2f7", padding: "5px 8px", fontSize: 12, fontFamily: "'DM Mono', monospace", outline: "none" }}>
                {columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 10, color: "#48484a", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em" }}>PRIORITY</span>
              <select value={t.priority} onChange={e => save({ priority: e.target.value })}
                style={{ background: "#1c1c1e", border: "1px solid #2c2c2e", borderRadius: 5, color: PRIORITY[t.priority].color, padding: "5px 8px", fontSize: 12, fontFamily: "'DM Mono', monospace", outline: "none" }}>
                {Object.keys(PRIORITY).map(p => <option key={p} value={p}>{PRIORITY[p].label}</option>)}
              </select>
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <span style={{ fontSize: 10, color: "#48484a", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em" }}>DUE DATE</span>
              <input type="text" placeholder="e.g. Mar 20" value={t.dueDate || ""} onChange={e => save({ dueDate: e.target.value || null })}
                style={{ background: "#1c1c1e", border: "1px solid #2c2c2e", borderRadius: 5, color: "#f2f2f7", padding: "5px 8px", fontSize: 12, fontFamily: "'DM Mono', monospace", outline: "none", width: 90 }} />
            </label>
          </div>

          <div>
            <p style={{ fontSize: 10, color: "#48484a", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", marginBottom: 6 }}>DESCRIPTION</p>
            <textarea value={t.desc} onChange={e => save({ desc: e.target.value })} rows={3}
              style={{ width: "100%", background: "#1c1c1e", border: "1px solid #2c2c2e", borderRadius: 5, color: "#aeaeb2", padding: "8px 10px", fontSize: 12, fontFamily: "'DM Mono', monospace", outline: "none", resize: "vertical", boxSizing: "border-box", lineHeight: 1.6 }} />
          </div>

          <div>
            <p style={{ fontSize: 10, color: "#48484a", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", marginBottom: 8 }}>TAGS</p>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
              {t.tags.map((tag, i) => (
                <span key={tag} style={{ display: "flex", alignItems: "center", gap: 4, padding: "3px 8px", borderRadius: 4, background: `${TAG_COLORS[i % TAG_COLORS.length]}18`, border: `1px solid ${TAG_COLORS[i % TAG_COLORS.length]}33` }}>
                  <span style={{ fontSize: 11, color: TAG_COLORS[i % TAG_COLORS.length], fontFamily: "'DM Mono', monospace" }}>{tag}</span>
                  <button onClick={() => save({ tags: t.tags.filter(x => x !== tag) })} style={{ background: "none", border: "none", color: "#636366", cursor: "pointer", fontSize: 12, padding: 0, lineHeight: 1 }}>×</button>
                </span>
              ))}
              <TagAdder onAdd={tag => { if (tag && !t.tags.includes(tag)) save({ tags: [...t.tags, tag] }); }} />
            </div>
          </div>

          <div>
            <p style={{ fontSize: 10, color: "#48484a", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", marginBottom: 8 }}>COMMENTS ({t.comments.length})</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 10 }}>
              {t.comments.map(c => (
                <div key={c.id} style={{ background: "#1c1c1e", borderRadius: 5, padding: "8px 12px", border: "1px solid #2c2c2e" }}>
                  <span style={{ fontSize: 10, color: "#48484a", fontFamily: "'DM Mono', monospace" }}>{c.time}</span>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "#aeaeb2", fontFamily: "'DM Mono', monospace", lineHeight: 1.5 }}>{c.text}</p>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={commentText} onChange={e => setCommentText(e.target.value)} onKeyDown={e => e.key === "Enter" && addComment()} placeholder="Add a comment…"
                style={{ flex: 1, background: "#1c1c1e", border: "1px solid #2c2c2e", borderRadius: 5, color: "#f2f2f7", padding: "7px 10px", fontSize: 12, fontFamily: "'DM Mono', monospace", outline: "none" }} />
              <button onClick={addComment} style={{ background: "#0a84ff", border: "none", borderRadius: 5, color: "#fff", cursor: "pointer", padding: "7px 14px", fontSize: 11, fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>POST</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Add Task Modal ─────────────────────────────────────────────────────────
function AddTaskModal({ colId, columns, onClose, onAdd }) {
  const [title, setTitle]     = useState("");
  const [desc, setDesc]       = useState("");
  const [priority, setPri]    = useState("medium");
  const [selectedCol, setCol] = useState(colId);

  const submit = () => {
    if (!title.trim()) return;
    onAdd({ id: uid(), colId: selectedCol, title: title.trim(), desc, priority, tags: [], comments: [], attachments: 0, createdAt: nowFull(), dueDate: null });
    onClose();
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#141414", border: "1px solid #2c2c2e", borderRadius: 10, width: 420, padding: "24px", boxShadow: "0 32px 80px rgba(0,0,0,0.7)" }}>
        <h2 style={{ margin: "0 0 20px", fontSize: 15, fontWeight: 800, color: "#f2f2f7", fontFamily: "'Syne', sans-serif", letterSpacing: "-0.02em" }}>NEW TASK</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Task title *" autoFocus
            style={{ background: "#1c1c1e", border: "1px solid #2c2c2e", borderRadius: 5, color: "#f2f2f7", padding: "9px 12px", fontSize: 14, fontFamily: "'Syne', sans-serif", outline: "none" }} />
          <textarea value={desc} onChange={e => setDesc(e.target.value)} placeholder="Description…" rows={2}
            style={{ background: "#1c1c1e", border: "1px solid #2c2c2e", borderRadius: 5, color: "#aeaeb2", padding: "9px 12px", fontSize: 12, fontFamily: "'DM Mono', monospace", outline: "none", resize: "none" }} />
          <div style={{ display: "flex", gap: 8 }}>
            <select value={selectedCol} onChange={e => setCol(e.target.value)}
              style={{ flex: 1, background: "#1c1c1e", border: "1px solid #2c2c2e", borderRadius: 5, color: "#f2f2f7", padding: "7px 8px", fontSize: 12, fontFamily: "'DM Mono', monospace", outline: "none" }}>
              {columns.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <select value={priority} onChange={e => setPri(e.target.value)}
              style={{ flex: 1, background: "#1c1c1e", border: "1px solid #2c2c2e", borderRadius: 5, color: PRIORITY[priority].color, padding: "7px 8px", fontSize: 12, fontFamily: "'DM Mono', monospace", outline: "none" }}>
              {Object.keys(PRIORITY).map(p => <option key={p} value={p}>{PRIORITY[p].label}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, background: "#1c1c1e", border: "1px solid #2c2c2e", borderRadius: 5, color: "#636366", cursor: "pointer", padding: 9, fontSize: 12, fontFamily: "'DM Mono', monospace" }}>CANCEL</button>
          <button onClick={submit} disabled={!title.trim()}
            style={{ flex: 2, background: title.trim() ? "#0a84ff" : "#1c1c1e", border: "none", borderRadius: 5, color: title.trim() ? "#fff" : "#3a3a3c", cursor: title.trim() ? "pointer" : "not-allowed", padding: 9, fontSize: 12, fontFamily: "'DM Mono', monospace", fontWeight: 700, letterSpacing: "0.08em", transition: "all 0.15s" }}>
            CREATE TASK
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Add Column Modal ───────────────────────────────────────────────────────
function AddColumnModal({ onClose, onAdd }) {
  const [title, setTitle] = useState("");
  const [color, setColor] = useState("#0a84ff");
  const [limit, setLimit] = useState("");
  const colors = ["#0a84ff","#bf5af2","#ff375f","#ff9f0a","#30d158","#5ac8fa","#ff2d55","#636366"];
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: "#141414", border: "1px solid #2c2c2e", borderRadius: 10, width: 360, padding: 24 }}>
        <h2 style={{ margin: "0 0 18px", fontSize: 14, fontWeight: 800, color: "#f2f2f7", fontFamily: "'Syne', sans-serif", letterSpacing: "0.06em" }}>NEW COLUMN</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Column name *" autoFocus
            style={{ background: "#1c1c1e", border: "1px solid #2c2c2e", borderRadius: 5, color: "#f2f2f7", padding: "9px 12px", fontSize: 13, fontFamily: "'Syne', sans-serif", outline: "none" }} />
          <div>
            <p style={{ fontSize: 10, color: "#48484a", fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", margin: "0 0 8px" }}>COLOR</p>
            <div style={{ display: "flex", gap: 8 }}>
              {colors.map(c => (
                <button key={c} onClick={() => setColor(c)} style={{ width: 24, height: 24, borderRadius: "50%", background: c, border: color === c ? `2px solid #fff` : `2px solid transparent`, cursor: "pointer", boxShadow: color === c ? `0 0 8px ${c}` : "none", transition: "all 0.15s" }} />
              ))}
            </div>
          </div>
          <input value={limit} onChange={e => setLimit(e.target.value)} placeholder="WIP limit (optional)" type="number" min="1"
            style={{ background: "#1c1c1e", border: "1px solid #2c2c2e", borderRadius: 5, color: "#f2f2f7", padding: "8px 12px", fontSize: 12, fontFamily: "'DM Mono', monospace", outline: "none" }} />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 20 }}>
          <button onClick={onClose} style={{ flex: 1, background: "#1c1c1e", border: "1px solid #2c2c2e", borderRadius: 5, color: "#636366", cursor: "pointer", padding: 9, fontSize: 12, fontFamily: "'DM Mono', monospace" }}>CANCEL</button>
          <button onClick={() => { if (title.trim()) { onAdd({ id: uid(), title: title.trim().toUpperCase(), color, limit: limit ? parseInt(limit) : null }); onClose(); }}}
            disabled={!title.trim()}
            style={{ flex: 2, background: title.trim() ? color : "#1c1c1e", border: "none", borderRadius: 5, color: "#fff", cursor: title.trim() ? "pointer" : "not-allowed", padding: 9, fontSize: 12, fontFamily: "'DM Mono', monospace", fontWeight: 700 }}>
            ADD COLUMN
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function KanbanApp() {
  const [board, setBoard]           = useState(loadBoard);
  const [dragTaskId, setDragTaskId] = useState(null);
  const [dragOver, setDragOver]     = useState(null);
  const [openTask, setOpenTask]     = useState(null);
  const [addTaskCol, setAddTaskCol] = useState(null);
  const [addingCol, setAddingCol]   = useState(false);
  const [search, setSearch]         = useState("");
  const [filterPriority, setFP]     = useState("all");
  const [syncPulse, setSyncPulse]   = useState(false);

  useEffect(() => {
    saveBoard(board);
    setSyncPulse(true);
    const t = setTimeout(() => setSyncPulse(false), 800);
    return () => clearTimeout(t);
  }, [board]);

  const handleDragStart = useCallback((e, taskId) => {
    setDragTaskId(taskId);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDrop = useCallback((e, colId) => {
    e.preventDefault();
    if (!dragTaskId) return;
    setBoard(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id === dragTaskId ? { ...t, colId } : t) }));
    setDragTaskId(null);
    setDragOver(null);
  }, [dragTaskId]);

  const handleDragOver = useCallback((e) => { e.preventDefault(); }, []);

  const addTask      = (task)    => setBoard(prev => ({ ...prev, tasks: [...prev.tasks, task] }));
  const updateTask   = (updated) => setBoard(prev => ({ ...prev, tasks: prev.tasks.map(t => t.id === updated.id ? updated : t) }));
  const deleteTask   = (id)      => setBoard(prev => ({ ...prev, tasks: prev.tasks.filter(t => t.id !== id) }));
  const addColumn    = (col)     => setBoard(prev => ({ ...prev, columns: [...prev.columns, col] }));
  const deleteColumn = (colId)   => setBoard(prev => ({ columns: prev.columns.filter(c => c.id !== colId), tasks: prev.tasks.filter(t => t.colId !== colId) }));

  const filtered = board.tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPriority !== "all" && t.priority !== filterPriority) return false;
    return true;
  });

  const totalTasks = board.tasks.length;
  const doneTasks  = board.tasks.filter(t => t.colId === "done").length;
  const progress   = totalTasks ? Math.round((doneTasks / totalTasks) * 100) : 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #0a0a0a; }
        ::-webkit-scrollbar-thumb { background: #2c2c2e; border-radius: 2px; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
        @keyframes fadeIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:none} }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#080808", color: "#f2f2f7", fontFamily: "'DM Mono', monospace" }}>

        <header style={{ padding: "0 28px", height: 56, display: "flex", alignItems: "center", gap: 16, borderBottom: "1px solid #1c1c1e", background: "#0a0a0a", position: "sticky", top: 0, zIndex: 100 }}>

          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 8 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
              {["#0a84ff","#bf5af2","#ff9f0a","#30d158"].map(c => (
                <div key={c} style={{ width: 8, height: 8, borderRadius: 2, background: c }} />
              ))}
            </div>
            <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.15em", color: "#f2f2f7", fontFamily: "'Syne', sans-serif" }}>FLOW</span>
            <span style={{ fontSize: 10, color: "#48484a", letterSpacing: "0.1em" }}>KANBAN</span>
          </div>

          {/* Search */}
          <div style={{ position: "relative", flex: 1, maxWidth: 280 }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#3a3a3c", fontSize: 12 }}>⌕</span>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks…"
              style={{ width: "100%", background: "#141414", border: "1px solid #2c2c2e", borderRadius: 6, color: "#f2f2f7", padding: "6px 10px 6px 28px", fontSize: 12, fontFamily: "'DM Mono', monospace", outline: "none" }} />
          </div>

          {/* Priority Filter */}
          <select value={filterPriority} onChange={e => setFP(e.target.value)}
            style={{ background: "#141414", border: "1px solid #2c2c2e", borderRadius: 5, color: "#aeaeb2", padding: "5px 8px", fontSize: 11, fontFamily: "'DM Mono', monospace", outline: "none" }}>
            <option value="all">ALL PRIORITY</option>
            {Object.keys(PRIORITY).map(p => <option key={p} value={p}>{PRIORITY[p].label}</option>)}
          </select>

          {/* Stats */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginLeft: "auto" }}>
            <span style={{ fontSize: 11, color: "#48484a" }}>
              <span style={{ color: "#30d158", fontWeight: 700 }}>{doneTasks}</span>/{totalTasks} DONE
            </span>

            {/* Progress ring */}
            <svg width="28" height="28" style={{ transform: "rotate(-90deg)" }}>
              <circle cx="14" cy="14" r="10" fill="none" stroke="#1c1c1e" strokeWidth="3" />
              <circle cx="14" cy="14" r="10" fill="none" stroke="#30d158" strokeWidth="3"
                strokeDasharray={`${2 * Math.PI * 10}`}
                strokeDashoffset={`${2 * Math.PI * 10 * (1 - progress / 100)}`}
                style={{ transition: "stroke-dashoffset 0.6s ease" }} />
            </svg>

            <div style={{ height: 20, width: 1, background: "#2c2c2e" }} />

            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: syncPulse ? "#30d158" : "#2c2c2e", animation: syncPulse ? "pulse 0.8s ease" : "none", transition: "background 0.3s" }} />
              <span style={{ fontSize: 10, color: "#3a3a3c" }}>SAVED</span>
            </div>
          </div>
        </header>

        {/* Progress bar */}
        <div style={{ height: 2, background: "#1c1c1e" }}>
          <div style={{ height: "100%", width: `${progress}%`, background: "linear-gradient(90deg, #0a84ff, #30d158)", transition: "width 0.6s ease" }} />
        </div>

        {/* Board */}
        <div style={{ padding: "24px 28px", overflowX: "auto", display: "flex", gap: 16, alignItems: "flex-start", minHeight: "calc(100vh - 60px)", animation: "fadeIn 0.4s ease" }}>
          {board.columns.map(col => {
            const colTasks = filtered.filter(t => t.colId === col.id);
            return (
              <Column key={col.id} col={col} tasks={colTasks}
                onDragStart={handleDragStart}
                onDrop={handleDrop}
                onDragOver={e => { handleDragOver(e); setDragOver(col.id); }}
                onDragLeave={() => setDragOver(null)}
                isDragOver={dragOver === col.id}
                onOpen={task => setOpenTask(task)}
                onAddTask={colId => setAddTaskCol(colId)}
                onDeleteColumn={deleteColumn}
              />
            );
          })}

          <button onClick={() => setAddingCol(true)}
            style={{ width: 200, flexShrink: 0, padding: "12px 16px", background: "transparent", border: "1px dashed #2c2c2e", borderRadius: 6, color: "#3a3a3c", cursor: "pointer", fontSize: 11, fontFamily: "'DM Mono', monospace", letterSpacing: "0.1em", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, height: 48, transition: "all 0.15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = "#636366"; e.currentTarget.style.color = "#636366"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = "#2c2c2e"; e.currentTarget.style.color = "#3a3a3c"; }}>
            + NEW COLUMN
          </button>
        </div>
      </div>

      {openTask && (
        <TaskModal task={openTask} columns={board.columns} onClose={() => setOpenTask(null)}
          onUpdate={t => { updateTask(t); setOpenTask(t); }} onDelete={deleteTask} />
      )}
      {addTaskCol && (
        <AddTaskModal colId={addTaskCol} columns={board.columns} onClose={() => setAddTaskCol(null)} onAdd={addTask} />
      )}
      {addingCol && (
        <AddColumnModal onClose={() => setAddingCol(false)} onAdd={addColumn} />
      )}
    </>
  );
}