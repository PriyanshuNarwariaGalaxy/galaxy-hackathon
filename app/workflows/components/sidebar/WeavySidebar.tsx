"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from "react";
import { ClockFading, Search } from "lucide-react";

const NODE_ITEMS = [
  { type: "prompt", label: "Prompt" },
  { type: "image", label: "Image" },
  { type: "llm", label: "Run LLM" },
] as const;

type IconKey = "search" | "quick";

export default function WeavySidebar({
  projectName,
  onAddNodeCenter,
}: {
  projectName: string;
  onAddNodeCenter: (type: (typeof NODE_ITEMS)[number]["type"]) => void;
}) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeIcon, setActiveIcon] = useState<IconKey | null>(null);
  const [search, setSearch] = useState("");
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!panelOpen) setActiveIcon(null);
  }, [panelOpen]);

  useEffect(() => {
    if (!panelOpen) return;
    const onDoc = (e: MouseEvent) => {
      const el = wrapRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setPanelOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [panelOpen]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return NODE_ITEMS;
    return NODE_ITEMS.filter((n) => n.label.toLowerCase().includes(q));
  }, [search]);

  const toggle = useCallback((key: IconKey) => {
    setActiveIcon((prev) => {
      const next = prev === key ? null : key;
      return next;
    });
    setPanelOpen((open) => {
      // if switching icons while open, keep open
      if (!open) return true;
      // if clicking same icon, collapse
      return activeIcon === key ? false : true;
    });
  }, [activeIcon]);

  const handleDragStart = useCallback((type: string) => (e: DragEvent) => {
    e.dataTransfer.setData("application/reactflow", type);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  return (
    <div ref={wrapRef} className="flex h-full select-none">
      {/* Icon bar (always visible) */}
      <aside className="w-[64px] bg-[#212126] border-r border-white/10 flex flex-col items-center py-3 gap-3">
        <a
          href="/"
          className="w-9 h-9 rounded-md bg-white/10 flex items-center justify-center font-bold text-white hover:bg-white/20 transition-colors"
          title="Home"
        >
          W
        </a>

        <IconButton
          icon={<Search size={18} />}
          active={activeIcon === "search"}
          onClick={() => toggle("search")}
          label="Search"
        />
        <IconButton
          icon={<ClockFading size={18} />}
          active={activeIcon === "quick"}
          onClick={() => toggle("quick")}
          label="Quick access"
        />

        <div className="flex-1" />
      </aside>

      {/* Expandable panel */}
      <aside
        className={[
          "bg-[#212126] border-r border-white/10 overflow-hidden transition-all duration-200 ease-out",
          panelOpen ? "w-[280px]" : "w-0",
        ].join(" ")}
      >
        {panelOpen && (
          <div className="h-full px-4 py-4">
            <div className="text-sm font-medium text-white truncate">{projectName}</div>

            <div className="mt-4">
              <div className="flex items-center gap-2 rounded-md bg-black/30 border border-white/10 px-2 py-1.5">
                <Search size={14} className="text-white/40" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search nodes"
                  className="w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
                />
              </div>
            </div>

            <div className="mt-6">
              <div className="text-sm text-white/80 mb-3">Quick access</div>
              <div className="grid grid-cols-2 gap-3">
                {filtered.map((node) => (
                  <QuickCard
                    key={node.type}
                    label={node.label}
                    onClick={() => onAddNodeCenter(node.type)}
                    onDragStart={handleDragStart(node.type)}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}

function IconButton({
  icon,
  onClick,
  active,
  label,
}: {
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      className={[
        "w-9 h-9 rounded-md flex items-center justify-center transition-all",
        active ? "bg-[#FAFFC7] text-black" : "text-white hover:bg-white/5",
      ].join(" ")}
    >
      {icon}
    </button>
  );
}

function QuickCard({
  label,
  onClick,
  onDragStart,
}: {
  label: string;
  onClick: () => void;
  onDragStart: (e: DragEvent) => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="border border-white/10 rounded-lg p-4 cursor-pointer flex flex-col gap-2 hover:bg-[#353539] transition items-center h-24 justify-center"
    >
      <div className="text-xs text-white">{label}</div>
    </div>
  );
}

