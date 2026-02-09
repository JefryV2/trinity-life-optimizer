import { useNavigate, useLocation } from 'react-router-dom';
import { Activity, DollarSign, Heart, Home, User, Apple } from "lucide-react";

export const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { icon: Home, label: 'Trinity', href: '/', emoji: '🏠' },
    { icon: Activity, label: 'Health', href: '/health', emoji: '💚' },
    { icon: DollarSign, label: 'Wealth', href: '/wealth', emoji: '💎' },
    { icon: Heart, label: 'Relations', href: '/relations', emoji: '🤝' },
    { icon: User, label: 'Profile', href: '/profile', emoji: '👤' },

  ];

  const handleNavigation = (href: string) => {
    navigate(href);
  };

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 px-6 pb-4" style={{ paddingBottom: 'max(16px, calc(16px + env(safe-area-inset-bottom)))' }}>
      <div className="glass-panel rounded-full px-4 py-2 flex items-center justify-between shadow-[0_20px_40px_rgba(15,23,42,0.12)] border border-white/60 backdrop-blur-xl safe-area-left safe-area-right">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;
          return (
            <button
              key={item.label}
              className={`relative flex flex-col items-center gap-1 px-3 py-2 rounded-2xl transition-all duration-200 ${isActive ? "text-foreground" : "text-muted-foreground"}`}
              onClick={() => handleNavigation(item.href)}
            >
              <span
                className={`text-lg ${
                  isActive ? "scale-110" : "scale-95 opacity-70"
                } transition-transform`}
              >
                {item.emoji}
              </span>
              <span className="text-[0.65rem] font-semibold tracking-wide uppercase">
                {item.label}
              </span>
              {isActive && (
                <div className="absolute -bottom-1 w-6 h-1 rounded-full bg-gradient-to-r from-orange-400 to-orange-300" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};