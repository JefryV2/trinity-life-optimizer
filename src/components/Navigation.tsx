import { useLocation } from "react-router-dom";
import { BottomNav } from "@/components/Navigation/BottomNav";

const PATH_TO_TAB: Record<string, string> = {
  "/": "home",
  "/health": "health",
  "/wealth": "wealth",
  "/relations": "relations",
  "/profile": "profile",
};

/** Kept for the screens that still import `Navigation`. One nav, one shape. */
export const Navigation = () => (
  <BottomNav activeTab={PATH_TO_TAB[useLocation().pathname] ?? "home"} />
);
