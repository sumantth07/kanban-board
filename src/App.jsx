import { useState, useEffect, useRef, useCallback } from "react";

// ── Utilities ──────────────────────────────────────────────────────────────
const uid     = () => Math.random().toString(36).slice(2, 9);
const nowTime = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const nowDate = () => new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

// ── Priority config ────────────────────────────────────────────────────────
const PRIORITY = {
  critical: { label: "Critical", color: "#e53935", bg: "#ffebee" },
  high:     { label: "High",     color: "#f57c00", bg: "#fff3e0" },
  medium:   { label: "Medium",   color: "#388e3c", bg: "#e8f5e9" },
  low:      { label: "Low",      color: "#757575", bg: "#f5f5f5" },
};

// ── Fixed columns — no adding/deleting ────────────────────────────────────
const COLUMNS = [
  { id: "todo",     title: "To Do",       color: "#1e88e5" },
  { id: "progress", title: "In Progress", color: "#f57c00" },
  { id: "review",   title: "Review",      color: "#8e24aa" },
  { id: "done",     title: "Done",        color: "#43a047" },
];

// ── Humanized default tasks ────────────────────────────────────────────────
const DEFAULT_TASKS = [
  {
    id: uid(), colId: "todo",
    title: "Fix the mobile nav menu",
    desc: "The hamburger menu doesn't close when you tap outside of it on iOS. Happening on Safari 16+.",
    priority: "high", tags: ["Mobile", "Bug"],
    comments: [], createdAt: nowDate(), dueDate: "Mar 28",
  },
  {
    id: uid(), colId: "todo",
    title: "Update the forgot password flow",
    desc: "Users are reporting the reset email sometimes lands in spam. Need to check the email template and sender domain.",
    priority: "medium", tags: ["Bug", "Auth"],
    comments: [], createdAt: nowDate(), dueDate: "Apr 5",
  },
  {
    id: uid(), colId: "todo",
    title: "Write docs for the onboarding API",
    desc: "New teammates keep asking how the onboarding endpoints work. Just need a simple README section.",
    priority: "low", tags: ["Docs"],
    comments: [], createdAt: nowDate(), dueDate: null,
  },
  {
    id: uid(), colId: "progress",
    title: "Migrate user avatars to S3",
    desc: "Moving file storage off the server to S3. Half done — uploads work, deletes and updates still need wiring.",
    priority: "high", tags: ["Backend", "Storage"],
    comments: [], createdAt: nowDate(), dueDate: "Mar 25",
  },
  {
    id: uid(), colId: "progress",
    title: "Add pagination to the orders table",
    desc: "The orders page is loading all 3000+ rows at once and it's slow. Adding server-side pagination.",
    priority: "high", tags: ["Performance"],
    comments: [], createdAt: nowDate(), dueDate: null,
  },
  {
    id: uid(), colId: "review",
    title: "Dark mode — final polish",
    desc: "Most screens look good. A few modals and the date picker still have hardcoded light colors. PR is up.",
    priority: "medium", tags: ["UI"],
    comments: [], createdAt: nowDate(), dueDate: "Mar 22",
  },
  {
    id: uid(), colId: "done",
    title: "Set up error tracking with Sentry",
    desc: "Sentry is live in production. Error alerts going to the #bugs Slack channel.",
    priority: "medium", tags: ["DevOps"],
    comments: [], createdAt: nowDate(), dueDate: null,
  },
];

// ── Storage ────────────────────────────────────────────────────────────────
const KEY = "kanban_v5";
const load = () => { try { const d = localStorage.getItem(KEY); return d ? JSON.parse(d) : DEFAULT_TASKS; } catch { return DEFAULT_TASKS; } };
const save = (tasks) => { try { localStorage.setItem(KEY, JSON.stringify(tasks)); } catch {} };

// ── Tag colors ─────────────────────────────────────────────────────────────
const TAG_PALETTE = ["#1e88e5","#8e24aa","#e53935","#f57c00","#43a047","#00897b","#d81b60","#546e7a"];

// ══════════════════════════════════════════════════════════════════════════
// COMPONENTS
// ══════════════════════════════════════════════════════════════════════════

function Badge({ priority }) {
  const p = PRIORITY[priority];
  return (
    <span style={{
      fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 12,
      color: p.color, background: p.bg, border: `1px solid ${p.color}40`,
    }}>
      {p.label}
    </span>
  );
}

function TagChip({ label, i }) {
  const c = TAG_PALETTE[i % TAG_PALETTE.length];
  return (
    <span style={{
      fontSize: 11, padding: "2px 8px", borderRadius: 12,
      color: c, background: `${c}15`, border: `1px solid ${c}30`,
    }}>
      {label}
    </span>
  );
}

// ── Task Card ──────────────────────────────────────────────────────────────
function TaskCard({ task, colColor, onDragStart, onOpen }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, task.id)}
      onClick={() => onOpen(task)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: "#fff",
        border: "1px solid #e8e8e8",
        borderLeft: `4px solid ${colColor}`,
        borderRadius: 8,
        padding: "12px 14px",
        cursor: "grab",
        userSelect: "none",
        boxShadow: hovered ? "0 4px 16px rgba(0,0,0,0.10)" : "0 1px 3px rgba(0,0,0,0.06)",
        transform: hovered ? "translateY(-2px)" : "none",
        transition: "all 0.15s",
      }}
    >
      {/* Tags row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginBottom: 7 }}>
        <Badge priority={task.priority} />
        {task.tags.map((t, i) => <TagChip key={t} label={t} i={i} />)}
      </div>

      {/* Title */}
      <p style={{ margin: "0 0 5px", fontSize: 14, fontWeight: 600, color: "#1a1a1a", lineHeight: 1.4 }}>
        {task.title}
      </p>

      {/* Description — 2 lines max */}
      {task.desc && (
        <p style={{
          margin: "0 0 10px", fontSize: 12, color: "#888", lineHeight: 1.5,
          display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {task.desc}
        </p>
      )}

      {/* Footer */}
      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", alignItems: "center" }}>
        {task.dueDate && (
          <span style={{ fontSize: 11, color: "#f57c00" }}>📅 {task.dueDate}</span>
        )}
        {task.comments.length > 0 && (
          <span style={{ fontSize: 11, color: "#9e9e9e" }}>💬 {task.comments.length}</span>
        )}
      </div>
    </div>
  );
}

// ── Column ─────────────────────────────────────────────────────────────────
function Column({ col, tasks, dragOver, onDragStart, onDrop, onDragOver, onDragLeave, onOpen, onAddTask }) {
  const isOver = dragOver === col.id;
  return (
    <div style={{ width: 260, flexShrink: 0, display: "flex", flexDirection: "column", gap: 0 }}>

      {/* Header */}
      <div style={{
        padding: "10px 14px", borderRadius: "8px 8px 0 0",
        background: "#fff", border: "1px solid #e8e8e8", borderBottom: "none",
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{ width: 10, height: 10, borderRadius: "50%", background: col.color, flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: "#1a1a1a" }}>{col.title}</span>
        <span style={{
          fontSize: 12, fontWeight: 600, color: "#fff", background: col.color,
          borderRadius: 10, padding: "1px 7px", minWidth: 22, textAlign: "center",
        }}>
          {tasks.length}
        </span>
      </div>

      {/* Drop zone */}
      <div
        onDrop={e => onDrop(e, col.id)}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        style={{
          flex: 1, minHeight: 100, padding: "8px",
          display: "flex", flexDirection: "column", gap: 8,
          background: isOver ? `${col.color}08` : "#f7f8fa",
          border: `1px solid ${isOver ? col.color : "#e8e8e8"}`,
          borderTop: "none", borderRadius: "0 0 8px 8px",
          transition: "all 0.15s",
          outline: isOver ? `2px dashed ${col.color}60` : "none",
          outlineOffset: -4,
        }}
      >
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            colColor={col.color}
            onDragStart={onDragStart}
            onOpen={onOpen}
          />
        ))}

        {tasks.length === 0 && (
          <div style={{
            flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 12, color: "#ccc", minHeight: 60,
          }}>
            {isOver ? "Drop here" : "Empty"}
          </div>
        )}
      </div>

      {/* Add task button */}
      <button
        onClick={() => onAddTask(col.id)}
        style={{
          marginTop: 6, padding: "7px", background: "transparent",
          border: "1px dashed #d0d0d0", borderRadius: 8,
          color: "#aaa", cursor: "pointer", fontSize: 12,
          transition: "all 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = col.color; e.currentTarget.style.color = col.color; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "#d0d0d0"; e.currentTarget.style.color = "#aaa"; }}
      >
        + Add task
      </button>
    </div>
  );
}

// ── Tag input helper inside modal ──────────────────────────────────────────
function TagInput({ onAdd }) {
  const [active, setActive] = useState(false);
  const [val, setVal] = useState("");
  const ref = useRef();
  useEffect(() => { if (active) ref.current?.focus(); }, [active]);
  return active ? (
    <input
      ref={ref} value={val} onChange={e => setVal(e.target.value)}
      onKeyDown={e => {
        if (e.key === "Enter" && val.trim()) { onAdd(val.trim()); setVal(""); setActive(false); }
        if (e.key === "Escape") setActive(false);
      }}
      onBlur={() => setActive(false)}
      placeholder="Tag name"
      style={{
        border: "1px dashed #aaa", borderRadius: 12, padding: "2px 10px",
        fontSize: 12, outline: "none", width: 90, color: "#333",
      }}
    />
  ) : (
    <button
      onClick={() => setActive(true)}
      style={{
        border: "1px dashed #ccc", borderRadius: 12, padding: "2px 10px",
        fontSize: 12, color: "#aaa", background: "none", cursor: "pointer",
      }}
    >
      + tag
    </button>
  );
}

// ── Task Modal ─────────────────────────────────────────────────────────────
function TaskModal({ task, onClose, onUpdate, onDelete }) {
  const [t, setT] = useState({ ...task });
  const [comment, setComment] = useState("");

  // patch updates local state AND syncs to parent
  const patch = (fields) => {
    const updated = { ...t, ...fields };
    setT(updated);
    onUpdate(updated);
  };

  const postComment = () => {
    if (!comment.trim()) return;
    const newComment = { id: uid(), text: comment.trim(), time: nowTime() };
    const updated = { ...t, comments: [...t.comments, newComment] };
    onUpdate(updated);
    onClose();
  };

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
        zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
      }}
    >
      <div style={{
        background: "#fff", borderRadius: 12, width: "100%", maxWidth: 520,
        maxHeight: "90vh", display: "flex", flexDirection: "column",
        boxShadow: "0 20px 60px rgba(0,0,0,0.15)", overflow: "hidden",
      }}>

        {/* Header */}
        <div style={{ padding: "18px 20px 14px", borderBottom: "1px solid #f0f0f0", display: "flex", gap: 10, alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <input
              value={t.title}
              onChange={e => patch({ title: e.target.value })}
              style={{
                width: "100%", border: "none", outline: "none",
                fontSize: 17, fontWeight: 700, color: "#1a1a1a", padding: 0,
              }}
            />
            <p style={{ margin: "3px 0 0", fontSize: 11, color: "#bbb" }}>Added {t.createdAt}</p>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => { onDelete(t.id); onClose(); }}
              style={{
                padding: "5px 12px", borderRadius: 6, border: "1px solid #ffcdd2",
                background: "#fff5f5", color: "#e53935", cursor: "pointer", fontSize: 12,
              }}
            >
              Delete
            </button>
            <button
              onClick={onClose}
              style={{
                padding: "5px 10px", borderRadius: 6, border: "1px solid #e8e8e8",
                background: "#fafafa", color: "#888", cursor: "pointer", fontSize: 14,
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Column + Priority + Due date */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={labelStyle}>Column</label>
              <select value={t.colId} onChange={e => patch({ colId: e.target.value })} style={selectStyle}>
                {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={labelStyle}>Priority</label>
              <select value={t.priority} onChange={e => patch({ priority: e.target.value })} style={{ ...selectStyle, color: PRIORITY[t.priority].color }}>
                {Object.keys(PRIORITY).map(p => <option key={p} value={p}>{PRIORITY[p].label}</option>)}
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              <label style={labelStyle}>Due date</label>
              <input
                type="text" placeholder="e.g. Apr 10"
                value={t.dueDate || ""}
                onChange={e => patch({ dueDate: e.target.value || null })}
                style={{ ...selectStyle, width: 90 }}
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              value={t.desc} rows={3}
              onChange={e => patch({ desc: e.target.value })}
              style={{
                width: "100%", marginTop: 4, padding: "8px 10px", borderRadius: 6,
                border: "1px solid #e8e8e8", fontSize: 13, color: "#555",
                outline: "none", resize: "vertical", lineHeight: 1.5, boxSizing: "border-box",
              }}
            />
          </div>

          {/* Tags */}
          <div>
            <label style={labelStyle}>Tags</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginTop: 6, alignItems: "center" }}>
              {t.tags.map((tag, i) => (
                <span key={tag} style={{
                  display: "flex", alignItems: "center", gap: 4,
                  padding: "2px 8px", borderRadius: 12, fontSize: 12,
                  color: TAG_PALETTE[i % TAG_PALETTE.length],
                  background: `${TAG_PALETTE[i % TAG_PALETTE.length]}15`,
                  border: `1px solid ${TAG_PALETTE[i % TAG_PALETTE.length]}30`,
                }}>
                  {tag}
                  <button
                    onClick={() => patch({ tags: t.tags.filter(x => x !== tag) })}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#aaa", fontSize: 13, padding: 0, lineHeight: 1 }}
                  >×</button>
                </span>
              ))}
              <TagInput onAdd={tag => { if (!t.tags.includes(tag)) patch({ tags: [...t.tags, tag] }); }} />
            </div>
          </div>

          {/* Comments */}
          <div>
            <label style={labelStyle}>Comments ({t.comments.length})</label>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8, marginBottom: 10 }}>
              {t.comments.map(c => (
                <div key={c.id} style={{ background: "#f7f8fa", borderRadius: 8, padding: "8px 12px", border: "1px solid #eee" }}>
                  <p style={{ margin: "0 0 3px", fontSize: 13, color: "#333" }}>{c.text}</p>
                  <span style={{ fontSize: 11, color: "#bbb" }}>{c.time}</span>
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <input
                value={comment}
                onChange={e => setComment(e.target.value)}
                onKeyDown={e => e.key === "Enter" && postComment()}
                placeholder="Write a comment…"
                style={{
                  flex: 1, padding: "8px 12px", borderRadius: 8,
                  border: "1px solid #e8e8e8", fontSize: 13, outline: "none", color: "#333",
                }}
              />
              <button
                onClick={postComment}
                style={{
                  padding: "8px 16px", borderRadius: 8, border: "none",
                  background: "#1e88e5", color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600,
                }}
              >
                Post
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Add Task Modal ─────────────────────────────────────────────────────────
function AddModal({ colId, onClose, onAdd }) {
  const [title, setTitle]   = useState("");
  const [desc, setDesc]     = useState("");
  const [priority, setPri]  = useState("medium");
  const [col, setCol]       = useState(colId);

  const submit = () => {
    if (!title.trim()) return;
    onAdd({ id: uid(), colId: col, title: title.trim(), desc, priority, tags: [], comments: [], createdAt: nowDate(), dueDate: null });
    onClose();
  };

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
    >
      <div style={{ background: "#fff", borderRadius: 12, width: "100%", maxWidth: 420, padding: 24, boxShadow: "0 20px 60px rgba(0,0,0,0.15)" }}>
        <h3 style={{ margin: "0 0 18px", fontSize: 16, fontWeight: 700, color: "#1a1a1a" }}>New Task</h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            value={title} onChange={e => setTitle(e.target.value)}
            placeholder="What needs to be done?" autoFocus
            style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #e8e8e8", fontSize: 14, outline: "none", color: "#1a1a1a" }}
          />
          <textarea
            value={desc} onChange={e => setDesc(e.target.value)}
            placeholder="Add some details (optional)…" rows={2}
            style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #e8e8e8", fontSize: 13, outline: "none", resize: "none", color: "#555" }}
          />
          <div style={{ display: "flex", gap: 8 }}>
            <select value={col} onChange={e => setCol(e.target.value)} style={{ flex: 1, ...selectStyle }}>
              {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
            </select>
            <select value={priority} onChange={e => setPri(e.target.value)} style={{ flex: 1, ...selectStyle, color: PRIORITY[priority].color }}>
              {Object.keys(PRIORITY).map(p => <option key={p} value={p}>{PRIORITY[p].label}</option>)}
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 18 }}>
          <button onClick={onClose} style={{ flex: 1, padding: 9, borderRadius: 8, border: "1px solid #e8e8e8", background: "#fafafa", color: "#888", cursor: "pointer", fontSize: 13 }}>
            Cancel
          </button>
          <button onClick={submit} disabled={!title.trim()} style={{
            flex: 2, padding: 9, borderRadius: 8, border: "none",
            background: title.trim() ? "#1e88e5" : "#e8e8e8",
            color: title.trim() ? "#fff" : "#aaa",
            cursor: title.trim() ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 600,
          }}>
            Create Task
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Shared styles ──────────────────────────────────────────────────────────
const labelStyle = { fontSize: 11, fontWeight: 600, color: "#aaa", textTransform: "uppercase", letterSpacing: "0.05em" };
const selectStyle = {
  padding: "6px 10px", borderRadius: 8, border: "1px solid #e8e8e8",
  fontSize: 13, outline: "none", background: "#fafafa", color: "#333", cursor: "pointer",
};

// ══════════════════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════════════════
export default function KanbanApp() {
  const [tasks, setTasks]       = useState(load);
  const [dragId, setDragId]     = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [openTask, setOpenTask] = useState(null);
  const [addCol, setAddCol]     = useState(null);
  const [search, setSearch]     = useState("");
  const [filterPri, setFilterPri] = useState("all");
  const [saved, setSaved]       = useState(false);

  // Auto-save whenever tasks change
  useEffect(() => {
    save(tasks);
    setSaved(true);
    const t = setTimeout(() => setSaved(false), 1000);
    return () => clearTimeout(t);
  }, [tasks]);

  // ── Drag handlers ────────────────────────────────────────────────────────
  const onDragStart = useCallback((e, id) => {
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const onDrop = useCallback((e, colId) => {
    e.preventDefault();
    if (!dragId) return;
    setTasks(prev => prev.map(t => t.id === dragId ? { ...t, colId } : t));
    setDragId(null);
    setDragOver(null);
  }, [dragId]);

  const onDragOver = useCallback((e) => { e.preventDefault(); }, []);

  // ── CRUD ─────────────────────────────────────────────────────────────────
  const addTask    = (task)    => setTasks(prev => [...prev, task]);
  const updateTask = (updated) => setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));
  const deleteTask = (id)      => setTasks(prev => prev.filter(t => t.id !== id));
  const resetBoard = ()        => { if (window.confirm("Clear all tasks? This cannot be undone.")) setTasks([]); };

  // ── Filter ───────────────────────────────────────────────────────────────
  const filtered = tasks.filter(t => {
    if (search && !t.title.toLowerCase().includes(search.toLowerCase())) return false;
    if (filterPri !== "all" && t.priority !== filterPri) return false;
    return true;
  });

  const done  = tasks.filter(t => t.colId === "done").length;
  const total = tasks.length;
  const pct   = total ? Math.round((done / total) * 100) : 0;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Inter', sans-serif; background: #f0f2f5; }
        ::-webkit-scrollbar { width: 5px; height: 5px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #ddd; border-radius: 3px; }
        select { font-family: inherit; }
        input, textarea { font-family: inherit; }
      `}</style>

      <div style={{ minHeight: "100vh", background: "#f0f2f5" }}>

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <header style={{
          background: "#fff", borderBottom: "1px solid #e8e8e8",
          padding: "0 24px", height: 56, display: "flex", alignItems: "center", gap: 14,
          position: "sticky", top: 0, zIndex: 100,
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginRight: 4 }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: "#1e88e5", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ color: "#fff", fontSize: 14 }}>⬡</span>
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: "#1a1a1a" }}>Kanban</span>
          </div>

          {/* Search */}
          <div style={{ position: "relative", flex: 1, maxWidth: 260 }}>
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "#bbb", fontSize: 14 }}>🔍</span>
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks…"
              style={{
                width: "100%", padding: "6px 10px 6px 30px", borderRadius: 8,
                border: "1px solid #e8e8e8", fontSize: 13, outline: "none", color: "#333",
                background: "#fafafa",
              }}
            />
          </div>

          {/* Priority filter */}
          <select
            value={filterPri} onChange={e => setFilterPri(e.target.value)}
            style={{ ...selectStyle, fontSize: 13 }}
          >
            <option value="all">All priorities</option>
            {Object.keys(PRIORITY).map(p => <option key={p} value={p}>{PRIORITY[p].label}</option>)}
          </select>

          {/* Stats */}
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
            <span style={{ fontSize: 13, color: "#888" }}>
              <span style={{ color: "#43a047", fontWeight: 700 }}>{done}</span>/{total} done
            </span>

            {/* Progress bar */}
            <div style={{ width: 80, height: 6, background: "#f0f0f0", borderRadius: 3, overflow: "hidden" }}>
              <div style={{ width: `${pct}%`, height: "100%", background: "#43a047", borderRadius: 3, transition: "width 0.5s ease" }} />
            </div>

            {/* Saved indicator */}
            <span style={{ fontSize: 12, color: saved ? "#43a047" : "#ccc", transition: "color 0.3s" }}>
              {saved ? "✓ Saved" : "Saved"}
            </span>

            {/* Reset button */}
            <button
              onClick={resetBoard}
              style={{
                padding: "5px 12px", borderRadius: 8, border: "1px solid #ffcdd2",
                background: "#fff5f5", color: "#e53935", cursor: "pointer", fontSize: 12, fontWeight: 500,
              }}
            >
              Reset
            </button>
          </div>
        </header>

        {/* ── Board ──────────────────────────────────────────────────────── */}
        <div style={{
          padding: "24px", overflowX: "auto",
          display: "flex", gap: 14, alignItems: "flex-start",
          minHeight: "calc(100vh - 56px)",
        }}>
          {COLUMNS.map(col => (
            <Column
              key={col.id}
              col={col}
              tasks={filtered.filter(t => t.colId === col.id)}
              dragOver={dragOver}
              onDragStart={onDragStart}
              onDrop={onDrop}
              onDragOver={e => { onDragOver(e); setDragOver(col.id); }}
              onDragLeave={() => setDragOver(null)}
              onOpen={task => setOpenTask(task)}
              onAddTask={colId => setAddCol(colId)}
            />
          ))}
        </div>
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      {openTask && (
        <TaskModal
          task={openTask}
          onClose={() => setOpenTask(null)}
          onUpdate={t => { updateTask(t); }}
          onDelete={id => { deleteTask(id); setOpenTask(null); }}
        />
      )}
      {addCol && (
        <AddModal
          colId={addCol}
          onClose={() => setAddCol(null)}
          onAdd={addTask}
        />
      )}
    </>
  );
}