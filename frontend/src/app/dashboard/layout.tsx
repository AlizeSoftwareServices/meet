'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { 
  Calendar, 
  Clock, 
  LayoutDashboard, 
  LogOut, 
  User, 
  Users, 
  Menu, 
  X, 
  Sparkles, 
  Plug, 
  UsersRound, 
  Split, 
  Share2, 
  Link2, 
  Check, 
  Copy,
  ExternalLink 
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import ShareProfileModal from '@/components/ShareProfileModal';

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
  { href: '/dashboard/settings', label: 'Profile', icon: User },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [clickedLink, setClickedLink] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [copiedQuick, setCopiedQuick] = useState(false);

  // Fetch Profile data for sharing
  const { data: profile } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const res = await api.get('/profile');
      return res.data;
    },
    enabled: !!isAuthenticated,
  });

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

  const handleNavigation = (e: React.MouseEvent, href: string) => {
    const normalizedPathname = pathname.replace(/\/$/, '') || '/';
    if (normalizedPathname !== href) {
      setIsNavigating(true);
      setClickedLink(href);
    } else {
      e.preventDefault();
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

  const handleQuickCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://meet.alizesoftwareservices.com';
    const bookingUrl = `${origin}/book/${profile?.username || 'me'}`;
    navigator.clipboard.writeText(bookingUrl);
    setCopiedQuick(true);
    setTimeout(() => setCopiedQuick(false), 2000);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const username = profile?.username || 'me';
  const name = profile?.name || 'User';

  return (
    <div className="h-screen bg-background text-foreground flex flex-col md:flex-row font-sans selection:bg-primary/20 overflow-hidden w-full max-w-[100vw]">
      {/* Route Navigation Instant Progress Bar */}
      {isNavigating && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-600 via-indigo-500 to-sky-400 z-[100] animate-top-progress shadow-[0_0_10px_#2563eb]" />
      )}
      
      {/* Mobile Header (Glass with Safe Area Top Inset) */}
      <div className="md:hidden flex items-center justify-between safe-area-header px-4 pb-3.5 bg-background/95 backdrop-blur-xl border-b border-border sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Meet Logo" className="w-8 h-8 rounded-lg object-contain" />
          <span className="font-bold text-xl tracking-tight">
            Meet
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Mobile Top Share Button */}
          <Button
            size="sm"
            onClick={() => setIsShareModalOpen(true)}
            className="h-8.5 px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold gap-1.5 shadow-sm shadow-blue-500/20"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share Link
          </Button>

          <button 
            onClick={() => setIsMobileMenuOpen(true)} 
            className="p-2 text-foreground/80 hover:text-foreground bg-muted/60 rounded-lg transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
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
              className="absolute inset-y-0 left-0 w-72 h-full bg-background shadow-2xl border-r border-border flex flex-col safe-area-top safe-area-bottom"
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

              {/* Mobile Profile Card */}
              <div className="p-4 mx-4 mt-4 rounded-xl bg-blue-50/60 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                    {(name || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">{name}</p>
                    <p className="text-[10px] text-zinc-500 font-mono truncate">/book/{username}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsShareModalOpen(true);
                  }}
                  className="p-1.5 rounded-lg bg-blue-600 text-white text-xs hover:bg-blue-700 transition-colors shadow-sm"
                  title="Share Profile Link"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="p-4 flex flex-col gap-1 mt-1 flex-1 overflow-y-auto scrollbar-hide">
                {sidebarLinks.map((link) => {
                  const Icon = link.icon;
                  const normalizedPathname = pathname.replace(/\/$/, '') || '/';
                  const isActive = normalizedPathname === link.href;
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={(e) => handleNavigation(e, link.href)}
                      className={`group flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        isActive 
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-500/10 dark:text-blue-400' 
                          : 'text-foreground/70 hover:bg-muted hover:text-foreground'
                      }`}
                    >
                      <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-foreground/50 group-hover:text-foreground'} transition-colors`} />
                      <span>{link.label}</span>
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
        <div className="p-8 pb-5">
          <Link href="/dashboard" className="flex items-center gap-3 group">
            <img src="/logo.png" alt="Meet Logo" className="w-10 h-10 rounded-xl object-contain shadow-lg shadow-primary/30 group-hover:shadow-primary/50 transition-all duration-300" />
            <span className="font-bold text-2xl tracking-tight bg-clip-text text-transparent bg-gradient-to-br from-foreground to-foreground/70">
              Meet
            </span>
          </Link>
        </div>
        
        <div className="flex-1 px-4 py-2 flex flex-col gap-1 overflow-y-auto scrollbar-hide">
          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-4">Menu</div>
          {sidebarLinks.map((link) => {
            const Icon = link.icon;
            const normalizedPathname = pathname.replace(/\/$/, '') || '/';
            const isActive = normalizedPathname === link.href;
            const isPending = isNavigating && clickedLink === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                onClick={(e) => handleNavigation(e, link.href)}
              >
                <motion.div
                  whileHover={{ scale: isActive ? 1 : 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`group relative flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                    isActive 
                      ? 'text-blue-700 dark:text-blue-400 font-semibold' 
                      : 'text-foreground/70 hover:bg-muted/80 hover:text-foreground'
                  }`}
                >
                  <div className="flex items-center gap-3 relative z-10">
                    <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-foreground/50 group-hover:text-blue-500'} transition-colors`} />
                    <span>{link.label}</span>
                  </div>
                  
                  {isPending && (
                    <div className="relative z-10">
                      <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}

                  {/* Active Background Glow */}
                  {isActive && (
                    <motion.div
                      layoutId="activeSidebar"
                      className="absolute inset-0 bg-blue-50 dark:bg-blue-500/10 rounded-xl -z-10"
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
            className="flex items-center gap-3 px-4 py-2.5 w-full rounded-xl text-sm font-medium text-destructive/80 hover:text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </motion.button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* Desktop Top Header Bar with Profile Share Button */}
        <header className="hidden md:flex items-center justify-between px-8 py-3.5 border-b border-border/60 bg-background/60 backdrop-blur-xl shrink-0 z-30">
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground">
              Booking Page: <span className="font-mono text-foreground font-semibold">/book/{username}</span>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Copy Link Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleQuickCopy}
              className="h-9 px-3 rounded-xl border-border text-xs font-medium gap-1.5 hover:border-blue-500/40 hover:text-blue-600 transition-all shadow-sm"
              title="Copy public booking link"
            >
              {copiedQuick ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-600">Copied Link!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-muted-foreground" />
                  <span>Copy Link</span>
                </>
              )}
            </Button>

            {/* Share My Link Main Button */}
            <Button
              size="sm"
              onClick={() => setIsShareModalOpen(true)}
              className="h-9 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-semibold gap-2 shadow-md shadow-blue-500/20 hover:shadow-blue-500/30 transition-all"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share Profile Link
            </Button>

            {/* Profile Avatar Quick Link */}
            <Link href="/dashboard/settings">
              <div 
                className="w-9 h-9 rounded-xl bg-blue-600/10 text-blue-600 hover:bg-blue-600 hover:text-white border border-blue-600/20 flex items-center justify-center font-bold text-xs transition-all shadow-sm cursor-pointer"
                title="View Profile"
              >
                {(name || 'U').charAt(0).toUpperCase()}
              </div>
            </Link>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden relative w-full max-w-full">
          {/* Subtle decorative background blob */}
          <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl -z-10 pointer-events-none" />
          
          <div className="p-4 md:p-8 lg:p-10 max-w-7xl mx-auto min-h-full">
            {children}
          </div>
        </main>
      </div>

      {/* Profile Share Modal */}
      <ShareProfileModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        profile={profile}
      />
    </div>
  );
}

