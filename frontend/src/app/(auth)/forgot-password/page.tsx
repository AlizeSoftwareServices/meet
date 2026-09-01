'use client';

import { useState } from 'react';
import Link from 'next/link';
import { getApiBaseUrl } from '@/lib/api';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');

    try {
      const res = await fetch(`${getApiBaseUrl()}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage(data.message);
      } else {
        setError(data.message || 'An error occurred. Please try again.');
      }
    } catch (err) {
      setError('A network error occurred. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-background selection:bg-brand-blue/20">
      {/* Form Section */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative overflow-hidden">
        {/* Floating animated blobs behind the form box */}
        <div className="absolute top-[10%] left-[10%] w-[400px] h-[400px] bg-brand-blue/20 rounded-full mix-blend-multiply filter blur-[80px] opacity-70 animate-pulse -z-10" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[10%] right-[10%] w-[350px] h-[350px] bg-brand-purple/20 rounded-full mix-blend-multiply filter blur-[80px] opacity-70 animate-pulse -z-10" style={{ animationDuration: '10s', animationDelay: '2s' }} />

        <div className="w-full max-w-md space-y-8 relative z-10">
          <div className="flex flex-col space-y-2 text-center mb-8 relative z-10">
            <Link href="/" className="flex items-center gap-2 justify-center mb-6">
              <img src="/logo.png" alt="Meet Logo" className="w-10 h-10 rounded-xl object-contain shadow-lg" />
              <span className="font-extrabold text-2xl tracking-tight">Meet</span>
            </Link>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
              {message ? 'Check your email' : 'Forgot Password'}
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base font-medium">
              {message ? 'We sent a password reset link to your email.' : 'Enter your email to receive a password reset link.'}
            </p>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl border border-white/50 dark:border-zinc-800/50 p-8 sm:p-10 rounded-3xl shadow-2xl relative z-10"
          >
            {message ? (
              <div className="space-y-6 text-center">
                <div className="w-16 h-16 bg-brand-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-brand-green" />
                </div>
                <p className="text-foreground font-medium">
                  {message}
                </p>
                <div className="pt-4">
                  <Link href="/login">
                    <Button variant="outline" className="w-full h-12 font-bold">
                      Back to Login
                    </Button>
                  </Link>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold text-foreground">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="name@example.com"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-14 bg-white/50 dark:bg-zinc-950/50 border-border/50 focus:border-brand-purple focus:ring-brand-purple/20 transition-all rounded-xl text-base"
                  />
                </div>

                {error && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-4 text-sm text-brand-red font-bold bg-brand-red/10 border border-brand-red/20 rounded-xl text-center"
                  >
                    {error}
                  </motion.div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full h-14 text-lg font-black rounded-xl bg-gradient-to-r from-brand-blue to-brand-purple text-white shadow-xl shadow-brand-blue/30 hover:shadow-brand-purple/40 hover:scale-[1.02] transition-all duration-300 group mt-4"
                >
                  {loading ? 'Sending...' : (
                    <span className="flex items-center justify-center gap-2">
                      Send Reset Link <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  )}
                </Button>
              </form>
            )}
          </motion.div>

          {!message && (
            <div className="text-center text-sm text-muted-foreground mt-8 relative z-10 font-medium">
              Remembered your password?{' '}
              <Link href="/login" className="text-foreground hover:text-brand-purple font-bold transition-colors">
                Sign in here
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Decorative Branding Section - Hidden on Mobile, Visible on Laptop */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-zinc-950 items-center justify-center overflow-hidden p-12">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30" />
        
        {/* Animated Brand Blobs */}
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-brand-blue rounded-full mix-blend-screen filter blur-[100px] opacity-40 animate-pulse" style={{ animationDuration: '7s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-brand-purple rounded-full mix-blend-screen filter blur-[100px] opacity-40 animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />

        <div className="relative z-10 max-w-lg">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-[2rem] shadow-2xl text-center"
          >
            <h2 className="text-3xl font-black text-white mb-4 leading-tight">
              Secure Account Recovery
            </h2>
            <p className="text-white/80 font-medium">
              We'll help you get back to your account safely and quickly so you can continue managing your meetings.
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
