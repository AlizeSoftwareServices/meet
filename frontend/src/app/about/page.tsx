'use client';

import Link from 'next/link';
import { ArrowLeft, Users, Target, Shield, Heart, Calendar, CheckCircle2, Video } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';

export default function AboutPage() {
  const handleStartDemo = () => {
    localStorage.setItem('demoMode', 'true');
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen relative selection:bg-brand-blue/20 overflow-hidden">
      {/* Unique Premium Background */}
      <div className="fixed inset-0 z-[-1] h-full w-full bg-background bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] dark:bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:24px_24px]">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand-blue/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen opacity-70 animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute top-[20%] right-[-10%] w-[35%] h-[35%] rounded-full bg-brand-purple/20 blur-[120px] mix-blend-multiply dark:mix-blend-screen opacity-70 animate-pulse" style={{ animationDuration: '10s' }} />
        <div className="absolute bottom-[-10%] left-[20%] w-[50%] h-[50%] rounded-full bg-brand-red/10 blur-[120px] mix-blend-multiply dark:mix-blend-screen opacity-60 animate-pulse" style={{ animationDuration: '12s' }} />
      </div>

      {/* Navigation */}
      <nav className="border-b border-border/20 sticky top-0 bg-background/50 backdrop-blur-xl z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-sm font-bold text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Meet Logo" className="w-8 h-8 rounded-lg object-contain" />
            <span className="font-extrabold text-xl tracking-tight text-foreground">Meet</span>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-12 sm:py-24 px-4 sm:px-6 relative z-10 mt-8">
        <div className="max-w-5xl mx-auto text-center space-y-6 sm:space-y-8 bg-gradient-to-br from-brand-blue/10 via-brand-purple/5 to-brand-red/10 p-8 sm:p-20 rounded-3xl sm:rounded-[3rem] border border-border/50 shadow-2xl relative overflow-hidden backdrop-blur-sm">
          {/* Decorative shapes inside the hero */}
          <div className="absolute top-0 right-0 w-32 sm:w-64 h-32 sm:h-64 bg-brand-blue/10 rounded-full blur-2xl sm:blur-3xl -z-10" />
          <div className="absolute bottom-0 left-0 w-32 sm:w-64 h-32 sm:h-64 bg-brand-purple/10 rounded-full blur-2xl sm:blur-3xl -z-10" />
          
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-foreground tracking-tight">
            About <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-purple">Meet</span>
          </h1>
          <p className="text-lg sm:text-xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed relative z-10">
            Meet is your all-in-one platform for scheduling automation, customizable availability, and seamless integrations. We eliminate the back-and-forth emails, giving you back your time to focus on what matters most.
          </p>
        </div>


      </section>

      {/* Core Features */}
      <section className="py-24 px-6 relative border-y border-border/40 overflow-hidden">
        {/* Background Image with Moderate Opacity */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-50 dark:opacity-30 mix-blend-luminosity"
          style={{ backgroundImage: 'url("/features-bg.png")' }}
        />
        <div className="absolute inset-0 bg-zinc-50/70 dark:bg-zinc-950/80 backdrop-blur-[2px]" />
        
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-foreground mb-4">Platform Features</h2>
            <p className="text-lg text-muted-foreground">Everything you need to automate your scheduling workflows.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-background/60 backdrop-blur-md p-8 rounded-3xl border border-border/30 shadow-xl hover:shadow-brand-blue/10 hover:-translate-y-1 transition-all duration-300 space-y-4">
              <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center">
                <Users className="w-6 h-6 text-brand-blue" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Scheduling Automation</h3>
              <p className="text-muted-foreground font-medium">Create unlimited event types and share your links to let clients book time with you instantly.</p>
            </div>
            
            <div className="bg-background p-8 rounded-3xl border border-border/50 shadow-sm space-y-4">
              <div className="w-12 h-12 bg-brand-purple/10 rounded-2xl flex items-center justify-center">
                <Target className="w-6 h-6 text-brand-purple" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Custom Availability</h3>
              <p className="text-muted-foreground font-medium">Take full control of your calendar. Set custom weekly hours, buffers, and scheduling rules.</p>
            </div>

            <div className="bg-background p-8 rounded-3xl border border-border/50 shadow-sm space-y-4">
              <div className="w-12 h-12 bg-brand-green/10 rounded-2xl flex items-center justify-center">
                <Shield className="w-6 h-6 text-brand-green" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Powerful Integrations</h3>
              <p className="text-muted-foreground font-medium">Sync with Google Calendar, Zoom, Microsoft Teams, and Slack to automate your Meet links.</p>
            </div>

            <div className="bg-background p-8 rounded-3xl border border-border/50 shadow-sm space-y-4">
              <div className="w-12 h-12 bg-brand-red/10 rounded-2xl flex items-center justify-center">
                <Heart className="w-6 h-6 text-brand-red" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Analytics & Insights</h3>
              <p className="text-muted-foreground font-medium">Track your booking volume and Meet trends over time with our built-in analytics dashboard.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Team / Closing CTA */}
      <section className="py-16 sm:py-32 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto text-center space-y-6 sm:space-y-8 bg-zinc-900 dark:bg-zinc-950 p-8 sm:p-16 rounded-3xl sm:rounded-[3rem] shadow-2xl relative overflow-hidden border border-zinc-800">
          <div className="absolute inset-0 bg-gradient-to-tr from-brand-blue/20 to-brand-purple/20 opacity-50 blur-2xl sm:blur-3xl" />
          <div className="relative z-10">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-4 sm:mb-6">Ready to get started?</h2>
            <p className="text-lg sm:text-xl text-zinc-300 font-medium max-w-2xl mx-auto mb-8 sm:mb-10">
              Join Meet today and experience a new era of effortless scheduling and time management.
            </p>
            <div className="pt-2">
              <Button onClick={handleStartDemo} size="lg" className="rounded-full h-14 sm:h-16 px-8 sm:px-12 text-lg sm:text-xl font-bold bg-white text-zinc-900 hover:bg-zinc-100 hover:scale-105 transition-all shadow-xl">
                Try Interactive Demo
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
