'use client';

import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Sparkles, Calendar, Clock, Users, ArrowRight, ShieldCheck, Zap, Globe, Video, LinkIcon, CheckCircle2, ChevronDown, BarChart3, Plug } from 'lucide-react';
import { useEffect, useState } from 'react';
import { ContactModal } from '@/components/ContactModal';

import { Capacitor } from '@capacitor/core';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const router = useRouter();
  const [isNative, setIsNative] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0);
  
  const handleStartDemo = () => {
    localStorage.setItem('demoMode', 'true');
    window.location.href = '/dashboard';
  };

  useEffect(() => {
    setMounted(true);
    const native = Capacitor.isNativePlatform();
    setIsNative(native);

    if (native) {
      // In Mobile APK: Immediately redirect to dashboard if authenticated/demo, or login
      const token = localStorage.getItem('token');
      const isDemo = localStorage.getItem('demoMode') === 'true';
      if (token || isDemo) {
        router.replace('/dashboard');
      } else {
        router.replace('/login');
      }
    } else {
      // On Web Browser: Auto-redirect if logged in
      if (typeof window !== 'undefined' && localStorage.getItem('token')) {
        router.replace('/dashboard');
      }
    }
  }, [router]);

  useEffect(() => {
    if (!mounted) return;
    const timer = setInterval(() => {
      setActiveFeatureIndex((prev) => (prev + 1) % 3); // 3 features
    }, 5000);
    return () => clearInterval(timer);
  }, [mounted]);

  const interactiveFeatures = [
    {
      id: 'availability',
      title: 'Add your availability',
      description: 'Keep invitees informed of your availability. Take control of your calendar with detailed availability settings, scheduling rules, buffers, and more.',
      icon: <Calendar className="w-7 h-7" />,
      color: 'text-brand-purple',
      borderColor: 'border-brand-purple',
      mockup: (
        <div className="bg-white dark:bg-zinc-950 p-6 sm:p-8 rounded-[2rem] shadow-2xl border border-border w-full max-w-md">
          <div className="flex items-center gap-3 mb-8 border-b border-border pb-6">
            <Clock className="w-6 h-6 text-brand-purple" />
            <span className="font-black text-xl text-foreground">Weekly hours</span>
          </div>
          <div className="space-y-5">
            {['M', 'T', 'W', 'T', 'F'].map((day, i) => (
              <div key={`${day}-${i}`} className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-brand-purple/10 text-brand-purple flex items-center justify-center font-bold">{day}</div>
                <div className="flex-1 bg-zinc-50 dark:bg-zinc-900 border border-border/50 rounded-xl py-3 px-4 text-center font-semibold text-foreground shadow-sm">
                  {i % 2 === 0 ? '9:00 am - 5:00 pm' : '10:00 am - 4:30 pm'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )
    },
    {
      id: 'conferencing',
      title: 'Connect conferencing tools',
      description: 'Sync your video conferencing tools and set preferences for in-person Meets or calls.',
      icon: <Video className="w-7 h-7" />,
      color: 'text-brand-red',
      borderColor: 'border-brand-red',
      mockup: (
        <div className="bg-white dark:bg-zinc-950 p-6 sm:p-8 rounded-[2rem] shadow-2xl border border-border w-full max-w-md space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <Video className="w-6 h-6 text-brand-red" />
            <span className="font-black text-xl text-foreground">Video conferencing</span>
          </div>
          {['Zoom', 'Google Meet', 'Microsoft Teams', 'Webex'].map((tool) => (
            <div key={tool} className="flex items-center justify-between p-5 rounded-2xl border border-border hover:border-brand-red/50 hover:bg-brand-red/5 transition-all group shadow-sm">
              <span className="font-bold text-foreground text-lg">{tool}</span>
              <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-brand-red transition-colors" />
            </div>
          ))}
        </div>
      )
    },
    {
      id: 'share',
      title: 'Share your scheduling link',
      description: 'Easily book Meets by embedding scheduling links on your website, landing pages, or emails.',
      icon: <LinkIcon className="w-7 h-7" />,
      color: 'text-brand-green',
      borderColor: 'border-brand-green',
      mockup: (
        <div className="bg-white dark:bg-zinc-950 p-6 sm:p-8 rounded-[2rem] shadow-2xl border border-border w-full max-w-md space-y-6">
          <div className="flex items-center gap-3 mb-2">
            <LinkIcon className="w-6 h-6 text-brand-green" />
            <span className="font-black text-xl text-foreground">Share event types</span>
          </div>
          {['Client Onboarding', 'Quarterly Business Review'].map((event) => (
            <div key={event} className="p-6 rounded-2xl border-l-4 border-brand-green bg-brand-green/5 shadow-sm space-y-3">
              <span className="font-black text-lg block text-foreground">{event}</span>
              <div className="flex gap-6 text-sm font-bold text-brand-green">
                <span className="flex items-center gap-1"><LinkIcon className="w-3 h-3"/> Copy link</span>
              </div>
            </div>
          ))}
        </div>
      )
    }
  ];

  if (!mounted || isNative) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-xl shadow-primary/20">
          <Calendar className="w-8 h-8 text-primary" />
        </div>
        <h1 className="text-2xl font-black tracking-tight text-foreground">Meet</h1>
        <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin mt-2" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-blue/5 via-background to-brand-purple/5 selection:bg-brand-blue/20 overflow-x-hidden">
      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-xl border-b border-white/10 dark:border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between relative">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="Meet Logo" width={36} height={36} className="w-9 h-9 rounded-xl object-contain shadow-lg shadow-brand-purple/30" />
            <span className="font-extrabold text-xl tracking-tight text-foreground">Meet</span>
          </div>

          {/* Center Navigation Menu */}
          <div className="hidden md:flex items-center gap-8 absolute left-1/2 -translate-x-1/2 h-full">
            <div className="relative group h-full flex items-center">
              <button className="flex items-center gap-1 text-sm font-bold text-foreground hover:text-brand-blue transition-colors">
                Product <ChevronDown className="w-4 h-4 transition-transform group-hover:rotate-180" />
              </button>
              
              {/* Mega Menu Dropdown */}
              <div className="absolute top-full left-1/2 -translate-x-1/2 pt-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <div className="w-[600px] bg-background border border-border shadow-2xl rounded-2xl p-6 flex gap-6">
                  {/* Left Column: Core Features */}
                  <div className="flex-1 space-y-5">
                    <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest pl-2">Core Product</h4>
                    <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-brand-blue/5 transition-colors group/item cursor-default">
                      <div className="w-10 h-10 rounded-lg bg-brand-blue/10 flex items-center justify-center shrink-0">
                        <LinkIcon className="w-5 h-5 text-brand-blue" />
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-foreground group-hover/item:text-brand-blue transition-colors">Scheduling</h5>
                        <p className="text-xs text-muted-foreground mt-1">Create event types and share links.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-brand-purple/5 transition-colors group/item cursor-default">
                      <div className="w-10 h-10 rounded-lg bg-brand-purple/10 flex items-center justify-center shrink-0">
                        <Clock className="w-5 h-5 text-brand-purple" />
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-foreground group-hover/item:text-brand-purple transition-colors">Availability</h5>
                        <p className="text-xs text-muted-foreground mt-1">Set your weekly hours and exceptions.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-brand-red/5 transition-colors group/item cursor-default">
                      <div className="w-10 h-10 rounded-lg bg-brand-red/10 flex items-center justify-center shrink-0">
                        <Users className="w-5 h-5 text-brand-red" />
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-foreground group-hover/item:text-brand-red transition-colors">Bookings</h5>
                        <p className="text-xs text-muted-foreground mt-1">Manage and view all your Meets.</p>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Platform Features */}
                  <div className="flex-1 bg-muted/40 rounded-xl p-5 space-y-5 border border-border/50">
                    <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest pl-2">Platform</h4>
                    <div className="flex items-start gap-4 p-2 rounded-xl hover:bg-background transition-colors group/item cursor-default">
                      <div className="w-8 h-8 rounded-lg bg-background shadow-sm border border-border/50 flex items-center justify-center shrink-0">
                        <Plug className="w-4 h-4 text-foreground" />
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-foreground group-hover/item:text-foreground">Integrations</h5>
                        <p className="text-xs text-muted-foreground mt-0.5">Connect with Google, Zoom & more.</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-4 p-2 rounded-xl hover:bg-background transition-colors group/item cursor-default">
                      <div className="w-8 h-8 rounded-lg bg-background shadow-sm border border-border/50 flex items-center justify-center shrink-0">
                        <BarChart3 className="w-4 h-4 text-foreground" />
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-foreground group-hover/item:text-foreground">Analytics</h5>
                        <p className="text-xs text-muted-foreground mt-0.5">Track Meet trends and insights.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            <Link href="/about" className="text-sm font-bold text-foreground hover:text-brand-blue transition-colors">About</Link>
          </div>

          <div className="flex items-center gap-4">
            <Link href="/login" passHref>
              <Button className="rounded-full bg-foreground text-background hover:bg-brand-blue hover:text-white shadow-xl hover:shadow-brand-blue/30 transition-all duration-300 px-6 font-bold">
                Sign In
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="pt-32 pb-20 px-6 max-w-7xl mx-auto relative min-h-[85vh]">
        {/* Huge Moving Background Elements */}
        <motion.div 
          animate={{ 
            x: [0, 50, -30, 0], 
            y: [0, -60, 30, 0], 
            rotate: [0, 15, -10, 0],
            borderRadius: ['40% 60% 70% 30% / 40% 50% 60% 50%', '50% 50% 50% 50% / 50% 50% 50% 50%', '30% 70% 50% 50% / 50% 30% 70% 50%', '40% 60% 70% 30% / 40% 50% 60% 50%']
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[0%] right-[-10%] w-[500px] h-[600px] bg-brand-blue opacity-80 -z-10 mix-blend-multiply dark:mix-blend-screen filter blur-[2px]" 
        />
        <motion.div 
          animate={{ 
            x: [0, -60, 40, 0], 
            y: [0, 40, -40, 0], 
            rotate: [15, -15, 10, 15],
            borderRadius: ['60% 40% 30% 70% / 60% 30% 70% 40%', '40% 60% 50% 50% / 40% 50% 60% 50%', '70% 30% 50% 50% / 30% 70% 50% 50%', '60% 40% 30% 70% / 60% 30% 70% 40%']
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-[-15%] right-[15%] w-[600px] h-[500px] bg-brand-purple opacity-80 -z-10 mix-blend-multiply dark:mix-blend-screen filter blur-[2px]" 
        />
        <motion.div 
          animate={{ 
            x: [0, 70, -70, 0], 
            y: [0, 70, -30, 0], 
            rotate: [-20, 20, -10, -20],
            borderRadius: ['30% 70% 70% 30% / 30% 30% 70% 70%', '50% 50% 30% 70% / 50% 50% 70% 30%', '70% 30% 50% 50% / 70% 30% 50% 50%', '30% 70% 70% 30% / 30% 30% 70% 70%']
          }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[20%] left-[-15%] w-[400px] h-[400px] bg-brand-yellow opacity-40 -z-10 mix-blend-multiply dark:mix-blend-screen filter blur-[2px]" 
        />

        <div className="flex flex-col lg:flex-row items-center justify-between gap-16 lg:gap-8 pt-8">
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="flex-1 space-y-8"
          >
            <h1 className="text-5xl sm:text-6xl lg:text-[72px] font-black tracking-tight leading-[1.1] text-foreground">
              All the work around <br className="hidden sm:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue via-brand-purple to-brand-red">
                meetings, handled.
              </span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-lg leading-relaxed font-medium">
              From automated scheduling to instant video meet links and calendar invitations, get the busywork done with fewer tools and zero effort.
            </p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 pt-2">
              <Link href="/register" passHref>
                <Button size="lg" className="rounded-full text-lg px-8 h-14 bg-gradient-to-r from-brand-blue to-brand-purple text-white shadow-xl shadow-brand-blue/30 hover:shadow-brand-purple/40 hover:scale-105 transition-all duration-300 font-extrabold">
                  Get Started Free
                </Button>
              </Link>
              <Button onClick={handleStartDemo} variant="outline" size="lg" className="rounded-full text-lg px-8 h-14 border-2 border-border/50 hover:bg-muted font-bold text-foreground transition-all duration-300">
                Try Interactive Demo
              </Button>
            </div>
            
            <div className="pt-12 border-t border-border/50">
              <p className="text-xs font-bold text-muted-foreground mb-6 uppercase tracking-widest">Trusted by top organizations</p>
              <div className="flex flex-wrap items-center gap-8 opacity-70">
                <ShieldCheck className="w-8 h-8 text-foreground/80 hover:text-brand-purple transition-colors" />
                <Users className="w-8 h-8 text-foreground/80 hover:text-brand-blue transition-colors" />
                <Globe className="w-8 h-8 text-foreground/80 hover:text-brand-green transition-colors" />
                <Calendar className="w-8 h-8 text-foreground/80 hover:text-brand-yellow transition-colors" />
              </div>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="flex-1 relative w-full max-w-lg lg:max-w-none perspective-1000"
          >
            {/* Interactive Mockup */}
            <div className="relative bg-white dark:bg-zinc-950 rounded-[2rem] shadow-2xl border border-white/20 dark:border-white/10 overflow-hidden transform-gpu hover:-rotate-1 hover:scale-[1.02] transition-all duration-500">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-brand-green via-brand-yellow to-brand-red" />
              <div className="p-8 space-y-8 mt-2">
                <h3 className="text-2xl font-black text-foreground">Reduce no-shows and stay on track</h3>
                <div className="grid gap-5">
                  {/* Mock Workflow Card 1 */}
                  <motion.div 
                    whileHover={{ scale: 1.03, x: 5 }}
                    className="bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-start gap-4 transition-all cursor-pointer relative overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-brand-blue/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-12 h-12 rounded-xl bg-brand-blue/10 flex items-center justify-center shrink-0 relative z-10">
                      <Clock className="w-6 h-6 text-brand-blue" />
                    </div>
                    <div className="relative z-10">
                      <div className="text-[10px] font-black text-brand-blue uppercase tracking-widest mb-1.5">Workflow</div>
                      <h4 className="font-bold text-foreground text-lg">Send text reminder</h4>
                      <div className="mt-3 px-3 py-1.5 border border-brand-blue/20 bg-brand-blue/10 rounded-lg text-sm font-semibold text-brand-blue inline-block">
                        24 hours before event starts
                      </div>
                    </div>
                  </motion.div>

                  {/* Mock Workflow Card 2 */}
                  <motion.div 
                    whileHover={{ scale: 1.03, x: 5 }}
                    className="bg-zinc-50 dark:bg-zinc-900 rounded-2xl p-5 border border-zinc-200 dark:border-zinc-800 shadow-sm flex items-start gap-4 transition-all cursor-pointer relative overflow-hidden group"
                  >
                    <div className="absolute inset-0 bg-brand-green/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="w-12 h-12 rounded-xl bg-brand-green/10 flex items-center justify-center shrink-0 relative z-10">
                      <Zap className="w-6 h-6 text-brand-green" />
                    </div>
                    <div className="relative z-10">
                      <div className="text-[10px] font-black text-brand-green uppercase tracking-widest mb-1.5">Workflow</div>
                      <h4 className="font-bold text-foreground text-lg">Send follow-up email</h4>
                      <div className="mt-3 px-3 py-1.5 border border-brand-green/20 bg-brand-green/10 rounded-lg text-sm font-semibold text-brand-green inline-block">
                        2 hours after event ends
                      </div>
                    </div>
                  </motion.div>
                </div>
              </div>
            </div>
            
            {/* Decorative Floating Elements */}
            <motion.div 
              animate={{ y: [0, -15, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -right-6 -bottom-6 w-24 h-24 bg-brand-yellow rounded-2xl shadow-xl shadow-brand-yellow/30 flex items-center justify-center rotate-12 border-4 border-white dark:border-zinc-900"
            >
              <Calendar className="w-10 h-10 text-white" />
            </motion.div>
          </motion.div>
        </div>
      </main>

      {/* Features Section - Interactive Switcher */}
      <section className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="text-center mb-20">
            <h2 className="text-4xl sm:text-5xl font-black text-foreground mb-6">We make scheduling simple</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-medium">Everything you need to automate your scheduling workflows.</p>
          </div>
          
          <div className="flex flex-col lg:flex-row gap-16 items-center">
            {/* Left side: Feature List */}
            <div className="w-full lg:w-1/3 flex flex-col space-y-4">
              {interactiveFeatures.map((f, i) => {
                const isActive = activeFeatureIndex === i;
                return (
                  <div 
                    key={f.id}
                    onClick={() => setActiveFeatureIndex(i)}
                    className={`p-6 cursor-pointer border-l-4 rounded-r-2xl transition-all duration-300 ${
                      isActive 
                        ? `${f.borderColor} bg-card shadow-lg` 
                        : 'border-transparent hover:bg-muted/50'
                    }`}
                  >
                    <div className="flex items-center gap-4 mb-2">
                      <div className={`${isActive ? f.color : 'text-muted-foreground'}`}>
                        {f.icon}
                      </div>
                      <h3 className={`text-xl font-bold ${isActive ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {f.title}
                      </h3>
                    </div>
                    {isActive && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="pl-11"
                      >
                        <p className="text-muted-foreground font-medium leading-relaxed">
                          {f.description}
                        </p>
                        <div className="h-1.5 w-full bg-border mt-5 rounded-full overflow-hidden">
                          <motion.div 
                            key={`progress-${activeFeatureIndex}`}
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            transition={{ duration: 5, ease: "linear" }}
                            className={`h-full ${f.color.replace('text-', 'bg-')}`}
                          />
                        </div>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Right side: Mockup Display */}
            <div className="w-full lg:w-2/3 h-[600px] relative rounded-[3rem] overflow-hidden bg-zinc-50/80 dark:bg-zinc-900/50 shadow-2xl border border-border flex items-center justify-center p-8">
              
              {/* Always floating decorative shapes inside the box */}
              <motion.div 
                animate={{ y: [0, -30, 0], rotate: [0, 15, 0] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-10 left-10 w-16 h-16 rounded-2xl bg-brand-purple/20 border border-brand-purple/30 backdrop-blur-md flex items-center justify-center z-10"
              >
                <Calendar className="w-6 h-6 text-brand-purple opacity-70" />
              </motion.div>
              <motion.div 
                animate={{ y: [0, 40, 0], x: [0, -20, 0], rotate: [0, -20, 0] }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-12 right-12 w-20 h-20 rounded-full bg-brand-blue/20 border border-brand-blue/30 backdrop-blur-md flex items-center justify-center z-10"
              >
                <Clock className="w-8 h-8 text-brand-blue opacity-70" />
              </motion.div>
              <motion.div 
                animate={{ x: [0, 30, 0], rotate: [0, 45, 0] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
                className="absolute top-1/2 right-8 w-12 h-12 rounded-xl bg-brand-red/20 border border-brand-red/30 backdrop-blur-md flex items-center justify-center z-10"
              >
                <Users className="w-5 h-5 text-brand-red opacity-70" />
              </motion.div>

              {/* Dynamic Abstract Background for Mockup - Geometric Shapes with low opacity */}
              <motion.div 
                key={`bg-${activeFeatureIndex}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1, x: [0, 10, -10, 0], y: [0, -10, 10, 0] }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                className={`absolute top-[-10%] right-[-5%] w-[400px] h-[400px] rounded-[3rem] rotate-12 opacity-15 z-0 ${
                  activeFeatureIndex === 0 ? 'bg-brand-purple' :
                  activeFeatureIndex === 1 ? 'bg-brand-red' : 'bg-brand-green'
                }`}
              />
              
              <motion.div 
                key={`bg2-${activeFeatureIndex}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1, x: [0, -15, 15, 0], y: [0, 15, -15, 0] }}
                transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
                className={`absolute bottom-[-15%] left-[-10%] w-[350px] h-[350px] rounded-full opacity-15 z-0 ${
                  activeFeatureIndex === 0 ? 'bg-brand-blue' :
                  activeFeatureIndex === 1 ? 'bg-brand-yellow' : 'bg-brand-blue'
                }`}
              />

              <motion.div 
                key={`bg3-${activeFeatureIndex}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1, rotate: [0, 90, 0] }}
                transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                className={`absolute top-[20%] left-[20%] w-[500px] h-[500px] rounded-[4rem] opacity-5 z-0 ${
                  activeFeatureIndex === 0 ? 'border-[40px] border-brand-red' :
                  activeFeatureIndex === 1 ? 'border-[40px] border-brand-green' : 'border-[40px] border-brand-purple'
                }`}
              />
              
              {/* The Mockup */}
              <motion.div
                key={`mockup-${activeFeatureIndex}`}
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.5, type: 'spring', bounce: 0.4 }}
                className="w-full flex justify-center z-10 pointer-events-none select-none"
              >
                {interactiveFeatures[activeFeatureIndex].mockup}
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations Section */}
      <section className="py-32 px-6 bg-zinc-50 dark:bg-zinc-900/30 border-t border-border/50">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-16 gap-6">
            <div>
              <h2 className="text-4xl sm:text-5xl font-black text-foreground mb-4">
                Connect Meet to the<br />tools you already use
              </h2>
            </div>
            <div className="flex flex-col items-start md:items-end">
              <p className="text-muted-foreground font-medium mb-2">Boost productivity with powerful integrations</p>
              <Link href="/register" className="text-brand-blue font-bold flex items-center gap-2 hover:gap-3 transition-all">
                View all integrations <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>

          <div className="grid gap-6">
            {/* Small Tools Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-4">
              {[
                { 
                  name: 'Slack', 
                  bg: 'bg-[#4A154B]', 
                  icon: <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none"><path d="M5.04 15.21c-1.35 0-2.45-1.1-2.45-2.45s1.1-2.45 2.45-2.45 2.45 1.1 2.45 2.45v2.45H5.04zm1.23 0c0 1.35 1.1 2.45 2.45 2.45s2.45-1.1 2.45-2.45V8.29C11.17 6.94 10.07 5.84 8.72 5.84s-2.45 1.1-2.45 2.45v6.92z" fill="#36C5F0"/><path d="M8.79 5.04c0-1.35 1.1-2.45 2.45-2.45s2.45 1.1 2.45 2.45-1.1 2.45-2.45 2.45H8.79V5.04zm0 1.23c-1.35 0-2.45 1.1-2.45 2.45s1.1 2.45 2.45 2.45h6.92c1.35 0 2.45-1.1 2.45-2.45s-1.1-2.45-2.45-2.45H8.79z" fill="#2EB67D"/><path d="M18.96 8.79c1.35 0 2.45 1.1 2.45 2.45s-1.1 2.45-2.45 2.45-2.45-1.1-2.45-2.45V8.79h2.45zm-1.23 0c0-1.35-1.1-2.45-2.45-2.45s-2.45 1.1-2.45 2.45v6.92c0 1.35 1.1 2.45 2.45 2.45s2.45-1.1 2.45-2.45V8.79z" fill="#E01E5A"/><path d="M15.21 18.96c0 1.35-1.1 2.45-2.45 2.45s-2.45-1.1-2.45-2.45 1.1-2.45 2.45-2.45h2.45v2.45zm0-1.23c1.35 0 2.45-1.1 2.45-2.45s-1.1-2.45-2.45-2.45H8.29c-1.35 0-2.45 1.1-2.45 2.45s1.1 2.45 2.45 2.45h6.92z" fill="#ECB22E"/></svg> 
                },
                { 
                  name: 'Microsoft Teams', 
                  bg: 'bg-[#6264A7]', 
                  icon: <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M22.5 16.5h-5.91a2.82 2.82 0 01-2.82-2.82V7.77a2.82 2.82 0 012.82-2.82h5.91a2.82 2.82 0 012.82 2.82v5.91a2.82 2.82 0 01-2.82 2.82zm-12.27 0h-5.91A2.82 2.82 0 011.5 13.68V7.77A2.82 2.82 0 014.32 4.95h5.91a2.82 2.82 0 012.82 2.82v5.91a2.82 2.82 0 01-2.82 2.82z" /></svg> 
                },
                { 
                  name: 'Outlook', 
                  bg: 'bg-[#0078D4]', 
                  icon: <svg className="w-6 h-6 text-white" viewBox="0 0 24 24" fill="currentColor"><path d="M12.98 1.63L1.12 3.7C.5 3.8.02 4.34.02 4.98v13.56c0 .64.48 1.18 1.1 1.28l11.86 2.07c.81.14 1.55-.47 1.55-1.3V2.94c0-.82-.74-1.44-1.55-1.3z" /><path d="M14.53 4.22v15.08l8.47-1.39c.55-.09.98-.56.98-1.12V6.73c0-.56-.43-1.03-.98-1.12l-8.47-1.39z" /></svg> 
                },
                { 
                  name: 'Google Calendar', 
                  bg: 'bg-white border border-border', 
                  icon: <svg className="w-6 h-6" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg> 
                },
                { 
                  name: 'Google Meet', 
                  bg: 'bg-white border border-border', 
                  icon: <svg className="w-6 h-6" viewBox="0 0 24 24"><path fill="#00832d" d="M12 2.5v19l9.5-9.5z"/><path fill="#0066da" d="M2.5 12h9.5v9.5z"/><path fill="#e94235" d="M2.5 2.5h9.5v9.5z"/><path fill="#ffba00" d="M12 12h9.5v9.5z"/></svg> 
                },
              ].map((tool, i) => (
                <motion.div
                  key={tool.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-white dark:bg-zinc-950 p-6 rounded-2xl border border-border shadow-sm flex items-center justify-center hover:shadow-md hover:border-brand-blue/30 transition-all cursor-pointer group"
                >
                  <div className={`w-12 h-12 ${tool.bg} rounded-xl flex items-center justify-center shadow-sm group-hover:scale-110 transition-transform`}>
                    {tool.icon}
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Large Suite Cards */}
            <div className="grid md:grid-cols-2 gap-6">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="bg-white dark:bg-zinc-950 p-8 rounded-[2rem] border border-border shadow-sm hover:shadow-lg hover:border-brand-blue/30 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-zinc-100 flex items-center justify-center p-2">
                    <svg viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                  </div>
                  <ArrowRight className="w-6 h-6 text-muted-foreground group-hover:text-brand-blue group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-foreground">Google Workspace</h3>
                <p className="text-muted-foreground font-medium max-w-sm">
                  Get your job done faster by connecting Meet to Google Calendar and Google Meet to automate your scheduling.
                </p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 }}
                className="bg-white dark:bg-zinc-950 p-8 rounded-[2rem] border border-border shadow-sm hover:shadow-lg hover:border-brand-blue/30 transition-all cursor-pointer group"
              >
                <div className="flex justify-between items-start mb-6">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm border border-zinc-100 flex items-center justify-center grid grid-cols-2 gap-0.5 p-2.5">
                    <div className="bg-[#F25022] w-full h-full" />
                    <div className="bg-[#7FBA00] w-full h-full" />
                    <div className="bg-[#00A4EF] w-full h-full" />
                    <div className="bg-[#FFB900] w-full h-full" />
                  </div>
                  <ArrowRight className="w-6 h-6 text-muted-foreground group-hover:text-brand-blue group-hover:translate-x-1 transition-all" />
                </div>
                <h3 className="text-2xl font-bold mb-3 text-foreground">Microsoft Suite</h3>
                <p className="text-muted-foreground font-medium max-w-sm">
                  Make your day easier with Meet integrations for Microsoft Teams and Outlook Calendar.
                </p>
              </motion.div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-40 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-brand-purple to-brand-red opacity-10" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-brand-yellow/20 rounded-full blur-[120px] -z-10 animate-pulse" />
        
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-5xl sm:text-6xl font-black text-foreground mb-8 tracking-tight">Ready to streamline your calendar?</h2>
          <p className="text-2xl text-muted-foreground mb-12 font-medium">Experience Meet's full capabilities instantly.</p>
          <div className="flex flex-col sm:flex-row justify-center gap-6">
            <Button onClick={handleStartDemo} size="lg" className="rounded-full text-xl px-12 h-20 bg-foreground text-background hover:bg-brand-blue hover:text-white shadow-2xl hover:shadow-brand-blue/40 transition-all hover:scale-105 group font-bold">
              Try Interactive Demo
              <ArrowRight className="w-6 h-6 ml-3 group-hover:translate-x-2 transition-transform" />
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-zinc-50 dark:bg-zinc-950 border-t border-border/50 pt-20 pb-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-10 mb-16">
            <div className="col-span-1 lg:col-span-1">
              <div className="flex items-center gap-2 mb-6">
                <Image src="/logo.png" alt="Meet Logo" width={32} height={32} className="w-8 h-8 rounded-lg object-contain" />
                <span className="font-extrabold text-xl tracking-tight text-foreground">Meet</span>
              </div>
              <p className="text-muted-foreground font-medium mb-6">
                We make scheduling simple.
              </p>
              <div className="flex gap-4 text-muted-foreground">
                <span className="hover:text-brand-blue transition-colors cursor-default"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 4.557c-.883.392-1.832.656-2.828.775 1.017-.609 1.798-1.574 2.165-2.724-.951.564-2.005.974-3.127 1.195-.897-.957-2.178-1.555-3.594-1.555-3.179 0-5.515 2.966-4.797 6.045-4.091-.205-7.719-2.165-10.148-5.144-1.29 2.213-.669 5.108 1.523 6.574-.806-.026-1.566-.247-2.229-.616-.054 2.281 1.581 4.415 3.949 4.89-.693.188-1.452.232-2.224.084.626 1.956 2.444 3.379 4.6 3.419-2.07 1.623-4.678 2.348-7.29 2.04 2.179 1.397 4.768 2.212 7.548 2.212 9.142 0 14.307-7.721 13.995-14.646.962-.695 1.797-1.562 2.457-2.549z"/></svg></span>
                <span className="hover:text-brand-purple transition-colors cursor-default"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.88z"/></svg></span>
                <span className="hover:text-brand-red transition-colors cursor-default"><svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg></span>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-4">Product</h4>
              <ul className="space-y-3 text-sm text-muted-foreground font-medium">
                <li><span className="cursor-default">Scheduling</span></li>
                <li><span className="cursor-default">Availability</span></li>
                <li><span className="cursor-default">Bookings</span></li>
                <li><span className="cursor-default">Integrations</span></li>
                <li><span className="cursor-default">Analytics</span></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-foreground mb-4">Integrations</h4>
              <ul className="space-y-3 text-sm text-muted-foreground font-medium">
                <li><span className="cursor-default">Google Calendar & Meet</span></li>
                <li><span className="cursor-default">Microsoft Outlook & Teams</span></li>
                <li><span className="cursor-default">Slack</span></li>
              </ul>
            </div>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-border/50">
            <div className="text-sm text-muted-foreground font-medium">
              <p>&copy; {new Date().getFullYear()} Meet. All rights reserved.</p>
              <p className="mt-2 text-xs">
                Powered by <a href="https://www.alizesoftwareservices.com" target="_blank" rel="noopener noreferrer" className="font-bold text-brand-purple hover:underline">Alize Software Services LLP</a>
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-6 text-sm font-bold text-foreground">
              <span className="cursor-default text-muted-foreground">Privacy Policy</span>
              <span className="cursor-default text-muted-foreground">Terms of Service</span>
              <span className="cursor-default text-muted-foreground">Security</span>
            </div>
          </div>
        </div>
      </footer>

      <ContactModal 
        isOpen={isContactModalOpen} 
        onClose={() => setIsContactModalOpen(false)} 
        productName="Meet" 
      />
    </div>
  );
}
