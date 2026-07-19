"use client";

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { Shield, List, Settings, LogOut, Menu, X, LayoutDashboard, Users } from 'lucide-react';

const sidebarLinks = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/manage-staff", icon: List, label: "Staff Queue" },
  { href: "/users", icon: Users, label: "User Management" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

const BOTTOM_LINKS = [
  { href: "/", icon: Shield, label: "Back to App" },
  { href: "/api/auth/signout", icon: LogOut, label: "Sign Out" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const timer = setTimeout(() => setMobileSidebarOpen(false), 0);
    return () => clearTimeout(timer);
  }, [pathname]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setSidebarOpen(false);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <ProtectedRoute allowedRoles={["admin"]}>
      <div className="flex h-screen bg-zinc-950 text-zinc-100 relative">
        {/* Mobile overlay */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* Sidebar */}
        <aside
          className={`
            fixed lg:relative inset-y-0 left-0 z-50
            flex flex-col
            bg-zinc-900 border-r border-zinc-800
            transition-all duration-300 ease-in-out
            ${sidebarOpen ? "w-64" : "w-0 lg:w-16"}
            ${mobileSidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
            overflow-hidden
          `}
          aria-label="Admin sidebar"
        >
          {/* Sidebar Header */}
          <div className={`flex items-center justify-between h-16 px-4 border-b border-zinc-800 flex-shrink-0 ${!sidebarOpen && "lg:justify-center lg:px-0"}`}>
            <Link href="/" className={`flex items-center gap-3 min-w-0 ${!sidebarOpen && "lg:hidden"}`}>
              <Shield className="h-6 w-6 text-emerald-500 flex-shrink-0" />
              <h2 className="text-lg font-bold text-white truncate">Admin Panel</h2>
            </Link>
            <Link href="/" className={`hidden ${!sidebarOpen && "lg:flex"} items-center justify-center`}>
              <Shield className="h-6 w-6 text-emerald-500 flex-shrink-0" />
            </Link>
            <button
              onClick={() => {
                setSidebarOpen(!sidebarOpen);
                setMobileSidebarOpen(false);
              }}
              className="p-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors hidden lg:block"
              aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>

          {/* Main Navigation */}
          <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
            {sidebarLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                    ${isActive
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent"
                    }
                    ${!sidebarOpen && "lg:justify-center lg:px-2"}
                  `}
                  title={!sidebarOpen ? link.label : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className={`truncate ${!sidebarOpen && "lg:hidden"}`}>{link.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Bottom Links */}
          <div className="px-3 py-3 border-t border-zinc-800 space-y-1">
            {BOTTOM_LINKS.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`
                    flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                    text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60
                    ${!sidebarOpen && "lg:justify-center lg:px-2"}
                  `}
                  title={!sidebarOpen ? link.label : undefined}
                >
                  <Icon className="h-5 w-5 flex-shrink-0" />
                  <span className={`truncate ${!sidebarOpen && "lg:hidden"}`}>{link.label}</span>
                </Link>
              );
            })}
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Top bar with mobile menu button */}
          <header className="flex items-center gap-3 h-16 px-4 border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-sm flex-shrink-0">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              aria-label="Open sidebar"
            >
              <Menu className="h-5 w-5" />
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="hidden lg:block p-2 rounded-md text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              aria-label={sidebarOpen ? "Collapse sidebar" : "Expand sidebar"}
            >
              {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Shield className="h-5 w-5 text-emerald-500 lg:hidden" />
            <h1 className="text-sm font-bold uppercase tracking-wider text-zinc-300">
              Admin Panel
            </h1>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-zinc-950 via-[#01170f] to-zinc-950">
            {children}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
