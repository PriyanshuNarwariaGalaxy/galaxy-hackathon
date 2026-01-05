"use client";

import { useCallback, useEffect, useMemo, useState, type DragEvent } from "react";
import {
  FileText,
  Image as ImageIcon,
  Sparkles,
  Search,
  ClockFading,
} from "lucide-react";
import type { Node } from "reactflow";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useFlowStore } from "@/app/lib/store/flowStore";

interface SidebarProps {
  name: string;
  showName: (isVisible: boolean) => void;
}

const NODE_ITEMS = [
  { type: "prompt", label: "Prompt", icon: FileText },
  { type: "image", label: "Image", icon: ImageIcon },
  { type: "llm", label: "Run Any LLM", icon: Sparkles },
] as const;

export default function Sidebar({ name, showName }: SidebarProps) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(true);
  const [search, setSearch] = useState("");
  const addNode = useFlowStore((s) => s.addNode);
  type IconKey = "search" | "quick";

  const [activeIcon, setActiveIcon] = useState<IconKey | null>(null);

  useEffect(() => {
    if (collapsed) {
      setActiveIcon(null);
      showName(true);
    }
  }, [collapsed, showName]);


  const createNode = useCallback((type: Node["type"]) => {
    try {
      addNode({
        id: `${type}-${Date.now()}`,
        type,
        position: { x: 300, y: 200 },
        data: {},
      });
    } catch (err: any) {
      console.error("createNode error", err);
    } finally {
    }
  }, [addNode]);

  const filteredNodes = useMemo(
    () => NODE_ITEMS.filter((n) => n.label.toLowerCase().includes(search.toLowerCase())),
    [search]
  );

  const handleIconClick = useCallback((key: IconKey) => {
    setActiveIcon(key);
    showName(false);
    setCollapsed((v) => !v);
  }, [showName]);

  const handleDragStart = useCallback((type: string) => (e: DragEvent) => {
    e.dataTransfer.setData("application/reactflow", type);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  return (
    <div className="flex h-full">



      <aside className="w-[64px] bg-[#212126] border-r border-white/10 flex flex-col items-center py-3 gap-3">
        <Link
          href="/"
          className="w-9 h-9 rounded-md bg-white/10 flex items-center justify-center font-bold text-white hover:bg-white/20 transition-colors"
        >
          W
        </Link>
        <IconButton
          icon={<Search size={18} />}
          active={activeIcon === "search"}
          onClick={() => handleIconClick("search")}
        />

        <IconButton
          icon={<ClockFading size={18} />}
          active={activeIcon === "quick"}
          onClick={() => handleIconClick("quick")}
        />

        <div className="flex-1" />
      </aside>






      <aside
        className={`
          bg-[#212126]
          border-r border-white/10
          transition-all duration-300 ease-in-out
          overflow-hidden
          ${collapsed ? "w-0 px-0" : "w-[255px] px-4"}
        `}
      >
        {!collapsed && (
          <div className="h-full py-4">
            <div className="mb-4">
              <div className="text-white text-sm font-medium truncate">
                {name}
              </div>
            </div>


            <div className="mb-6">
              <div className="flex items-center gap-2 rounded-md bg-black/30 border border-white/10 px-2 py-1.5">
                <Search size={14} className="text-white/40" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search"
                  className="w-full bg-transparent text-sm text-white placeholder:text-white/40 focus:outline-none"
                />
              </div>
            </div>



            <div>
              <div className=" tracking-wide text-white mb-3">
                Quick access
              </div>

              <div className="grid grid-cols-2 gap-3">
                {filteredNodes.map((node) => (
                  <QuickCard
                    key={node.type}
                    icon={<node.icon size={18} />}
                    label={node.label}
                    onClick={() => createNode(node.type)}
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
}: {
  icon: React.ReactNode;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        relative
        w-9 h-9
        rounded-md
        flex items-center justify-center
        transition-all
        group
        ${active
          ? "bg-[#FAFFC7] text-black"
          : "text-white hover:text-white hover:bg-white/5"
        }
      `}
    >

      {icon}
    </button>
  );
}


function QuickCard({
  icon,
  label,
  onClick,
  onDragStart,
}: {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  onDragStart: (e: DragEvent) => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onClick={onClick}
      className="
        
        border border-white/10
        rounded-lg
        p-4
        cursor-pointer
        flex flex-col gap-3
        hover:bg-[#353539]
        transition
        items-center
        h-24
        justify-center
      "
    >
      <div className="text-white/80">{icon}</div>
      <div className="text-xs text-white">{label}</div>
    </div>
  );
}
