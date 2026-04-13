import { Routes, Route, NavLink } from "react-router";
import Today from "./pages/Today";
import History from "./pages/History";
import Reports from "./pages/Reports";
import Projects from "./pages/Projects";

const navLinks = [
  {
    to: "/",
    label: "Today",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    to: "/history",
    label: "History",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    to: "/reports",
    label: "Reports",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </svg>
    ),
  },
  {
    to: "/projects",
    label: "Projects",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-5 h-5">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
];

export default function App() {
  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 pb-16 sm:pb-0">
      {/* Desktop top nav */}
      <nav className="hidden sm:block border-b border-gray-800 px-4">
        <div className="mx-auto flex max-w-2xl gap-4">
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `py-3 text-sm font-medium border-b-2 transition-colors ${
                  isActive
                    ? "border-blue-500 text-blue-400"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </nav>

      <main className="mx-auto max-w-2xl">
        <Routes>
          <Route path="/" element={<Today />} />
          <Route path="/history" element={<History />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/projects" element={<Projects />} />
        </Routes>
      </main>

      {/* Mobile bottom nav */}
      <nav className="sm:hidden fixed bottom-0 inset-x-0 bg-gray-900 border-t border-gray-800 safe-bottom">
        <div className="flex justify-around">
          {navLinks.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                `flex flex-col items-center py-2 px-3 min-w-[64px] min-h-[48px] text-xs transition-colors ${
                  isActive ? "text-blue-400" : "text-gray-500"
                }`
              }
            >
              {icon}
              <span className="mt-0.5">{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
