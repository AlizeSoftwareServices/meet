"use client";

import Link from 'next/link';
import { ArrowLeft, Mail, MapPin, Phone } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function ContactPage() {
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
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand-blue/10 rounded-full blur-[100px] -z-10" />
        <div className="max-w-4xl mx-auto text-center space-y-6">
          <h1 className="text-5xl sm:text-7xl font-black text-foreground tracking-tight">
            Get in <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-blue to-brand-green">touch</span>
          </h1>
          <p className="text-xl text-muted-foreground font-medium max-w-2xl mx-auto leading-relaxed">
            We're here to help and answer any question you might have. We look forward to hearing from you.
          </p>
        </div>
      </section>

      {/* Contact Form and Details */}
      <section className="pb-32 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-16">
          {/* Form */}
          <div className="bg-white dark:bg-zinc-950 p-8 rounded-[2rem] shadow-xl border border-border">
            <form className="space-y-6" onSubmit={(e) => { e.preventDefault(); alert('Message sent successfully!'); }}>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" placeholder="John Doe" required className="h-12" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input id="email" type="email" placeholder="john@example.com" required className="h-12" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <textarea
                  id="message"
                  className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  placeholder="How can we help you?"
                  required
                />
              </div>
              <Button type="submit" size="lg" className="w-full h-12 text-lg font-bold">
                Send Message
              </Button>
            </form>
          </div>

          {/* Contact Details */}
          <div className="space-y-10 flex flex-col justify-center">
            <div>
              <h3 className="text-3xl font-black text-foreground mb-8">Contact Information</h3>
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-brand-blue/10 rounded-2xl flex items-center justify-center shrink-0">
                    <Mail className="w-6 h-6 text-brand-blue" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-foreground">Email</h4>
                    <p className="text-muted-foreground">team@alizesoftwareservices.com</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-brand-purple/10 rounded-2xl flex items-center justify-center shrink-0">
                    <Phone className="w-6 h-6 text-brand-purple" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-foreground">Phone</h4>
                    <p className="text-muted-foreground">HQ: +91 86107 01675</p>
                    <p className="text-muted-foreground">Admin: 04362 284583</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="pt-8 border-t border-border/50">
              <p className="text-muted-foreground text-sm font-medium">
                Powered by <a href="https://www.alizesoftwareservices.com" target="_blank" rel="noopener noreferrer" className="text-brand-purple hover:underline font-bold">Alize Software Services LLP</a>
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
