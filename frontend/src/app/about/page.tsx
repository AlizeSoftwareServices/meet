import Link from 'next/link';
import { ArrowLeft, Users, Target, Shield, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background selection:bg-brand-blue/20">
      {/* Navigation */}
      <nav className="border-b border-border/50 sticky top-0 bg-background/80 backdrop-blur-md z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="text-sm font-bold text-muted-foreground hover:text-foreground flex items-center gap-2 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-xl tracking-tight text-foreground">MeetSync</span>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-24 px-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-purple/10 rounded-full blur-[100px] -z-10" />
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h1 className="text-5xl sm:text-7xl font-black text-foreground tracking-tight">
            About <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-purple">Meeting</span>
          </h1>
          <p className="text-xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed">
            Meeting is your all-in-one platform for scheduling automation, customizable availability, and seamless integrations. We eliminate the back-and-forth emails, giving you back your time to focus on what matters most.
          </p>
        </div>
      </section>

      {/* Core Features */}
      <section className="py-24 px-6 bg-zinc-50 dark:bg-zinc-900/30 border-y border-border/50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-foreground mb-4">Platform Features</h2>
            <p className="text-lg text-muted-foreground">Everything you need to automate your scheduling workflows.</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="bg-background p-8 rounded-3xl border border-border/50 shadow-sm space-y-4">
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
              <p className="text-muted-foreground font-medium">Sync with Google Calendar, Zoom, Microsoft Teams, and Slack to automate your meeting links.</p>
            </div>

            <div className="bg-background p-8 rounded-3xl border border-border/50 shadow-sm space-y-4">
              <div className="w-12 h-12 bg-brand-red/10 rounded-2xl flex items-center justify-center">
                <Heart className="w-6 h-6 text-brand-red" />
              </div>
              <h3 className="text-xl font-bold text-foreground">Analytics & Insights</h3>
              <p className="text-muted-foreground font-medium">Track your booking volume and meeting trends over time with our built-in analytics dashboard.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Team / Closing CTA */}
      <section className="py-32 px-6">
        <div className="max-w-3xl mx-auto text-center space-y-8">
          <h2 className="text-4xl font-black text-foreground">Ready to get started?</h2>
          <p className="text-xl text-muted-foreground font-medium">
            Join Meeting today and experience a new era of effortless scheduling and time management.
          </p>
          <div className="pt-8">
            <Link href="/register">
              <Button size="lg" className="rounded-full h-14 px-8 text-lg font-bold">
                Get Started for Free
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
