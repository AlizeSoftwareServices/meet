'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Calendar, Clock, LayoutDashboard, LogOut, Settings, Users, Menu, X, Sparkles, Plug, UsersRound, Split } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const sidebarLinks = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/dashboard/events', label: 'Event Types', icon: Calendar },
  { href: '/dashboard/bookings', label: 'Bookings', icon: Users },
  { href: '/dashboard/availability', label: 'Availability', icon: Clock },
  { href: '/dashboard/teams', label: 'Teams', icon: UsersRound },
  { href: '/dashboard/routing', label: 'Routing Forms', icon: Split },
  { href: '/dashboard/polls', label: 'Meeting Polls', icon: Users },
  { href: '/dashboard/workflows', label: 'Workflows', icon: Sparkles },
  { href: '/dashboard/integrations', label: 'Integrations', icon: Plug },
  { href: '/dashboard/settings', label: 'Settings', icon: Settings },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [clickedLink, setClickedLink] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

  // Check auth immediately
  useEffect(() => {
    const isDemo = localStorage.getItem('demoMode') === 'true';
    if (isDemo) {
      setIsAuthenticated(true);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
    } else {
      setIsAuthenticated(true);
    }
  }, [router]);

  // Reset navigation state when pathname changes
  useEffect(() => {
    setIsNavigating(false);
    setClickedLink(null);
  }, [pathname]);

  const handleNavigation = (href: string) => {
    if (pathname !== href) {
      setIsNavigating(true);
      setClickedLink(href);
    }
    setIsMobileMenuOpen(false);
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to log out?")) {
      localStorage.removeItem('token');
      localStorage.removeItem('demoMode');
      localStorage.removeItem('demo_integrations');
      router.push('/');
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col md:flex-row font-sans selection:bg-primary/20">
      
      {/* Mobile Header (Glass) */}
      <div className="md:hidden flex items-center justify-between p-4 bg-background/80 backdrop-blur-xl border-b border-border sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Meet Logo" className="w-8 h-8 rounded-lg object-contain" />
          <span className="font-bold text-xl tracking-tight">
            Meet
          </span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(true)} className="p-2 text-foreground/80 hover:text-foreground transition-colors">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="absolute inset-y-0 left-0 w-72 h-full bg-background shadow-2xl border-r border-border flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 flex items-center justify-between border-b border-border shrink-0">
                <div className="flex items-center gap-2">
                  <img src="/logo.png" alt="Meet Logo" className="w-8 h-8 rounded-lg object-contain" />
                  <span className="font-bold text-xl tracking-tight">Meet</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)} className="p-2 text-foreground/70 hover:text-foreground bg-muted rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-4 flex flex-col gap-1.5 mt-2 flex-1 overflow-y-auto scrollbar-hide">
                {sidebarLinks.map((link) => {
                  const Icon = link.icon;
                  const isActive = pathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`group flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all ${
                        isActive 
                          ? 'bg-primary text-primary-foreground shadow-md shadow-primary/20' 
                          : 'text-foreground/70 hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <Icon className={`w-6 h-6 ${isActive ? 'text-primary-foreground' : 'text-foreground/50 group-hover:text-foreground'} transition-colors`} />
                      <span className="text-base">{link.label}</span>
                    </Link>
                  );
                })}
              </div>
              <div className="p-4 border-t border-border/50 shrink-0">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-medium text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Desktop Sidebar (Premium Glass effect) */}
      <aside className="hidden md:flex flex-col w-72 border-r border-border bg-sidebar/50 backdrop-blur-2xl h-screen sticky top-0 transition-all shadow-[1px_0_40px_rgba(0,0,0,0.02)] dark:shadow-[1px_0_40px_rgba(0,0,0,0.2)]">
        <div className="p-8 pb-6">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <img src="/logo.png" alt="Meet Logo" className="w-10 h-10 rounded-xl object-contain shadow-lg shadow-primary/30 group-hover:shadow-primary/50 transition-all duration-300" />
            <span className="font-bold text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">
              Meet
            </span>
          </Link>
        </div>
        
        <div className="flex-1 px-4 py-4 flex flex-col gap-1.5 overflow-y-auto scrollbar-hide">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-4">Menu</div>
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            const isPending = isNavigating && clickedLink === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => handleNavigation(link.href)}
              >
                <motion.div
                  whileHover={{ scale: isActive ? 1 : 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`group relative flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive 
                      ? 'text-primary-foreground shadow-md shadow-primary/25' 
                      : 'text-foreground/70 hover:bg-muted/80 hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-3 relative z-10">
                    <Icon className={`w-5 h-5 ${isActive ? 'text-primary-foreground' : 'text-foreground/50 group-hover:text-primary'} transition-colors`} />
                    <span>{link.label}</span>
                  </div>
                  
                  {isPending && (
                    <div className="relative z-10">
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}

                  {/* Active Background Glow */}
                  {isActive && (
                    <motion.div
                      layoutId="activeSidebar"
                      className="absolute inset-0 bg-gradient-to-r from-primary to-primary/90 rounded-xl -z-10"
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </div>
        
        <div className="p-4 border-t border-border/50">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogout}
            className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-sm font-medium text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </motion.button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto relative">
        {/* Subtle decorative background blob */}
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        
        <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto min-h-full">
          {children}
        </div>
      </main>
    </div>
  );
}
