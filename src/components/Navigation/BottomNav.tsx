import { useNavigate } from "react-router-dom";
const TABS = [
  { id: "home", label: "TODAY", path: "/" },
  { id: "health", label: "HEALTH", path: "/health" },
  { id: "wealth", label: "WEALTH", path: "/wealth" },
  { id: "relations", label: "BONDS", path: "/relations" },
  { id: "profile", label: "YOU", path: "/profile" },
] as const;
interface BottomNavProps {
  activeTab?: string;
} /** * The navigation is a pill, not a bar: five words, one lime fill for where you * are. No icons — the labels are short enough to read at a glance. */
export function BottomNav({ activeTab }: BottomNavProps) {
  const navigate = useNavigate();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50"
      style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
    >
      <div className="mx-auto w-full max-w-[430px] px-[18px]">
        <div className="flex items-center gap-[4px] rounded-pill border border-[#1b1b1e] bg-[#0a0a0c]/95 p-[5px] backdrop-blur-xl">
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => navigate(tab.path)}
                className={[
                  "press flex-1 rounded-pill py-[11px] text-[10px] font-bold uppercase tracking-[0.1em] transition-colors",
                  isActive
                    ? "bg-primary text-primary-foreground"
                    : "text-[#b4b4bb] hover:text-[#b4b4bb]",
                ].join(" ")}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
