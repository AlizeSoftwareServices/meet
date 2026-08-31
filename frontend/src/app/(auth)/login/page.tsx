'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Capacitor } from '@capacitor/core';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, ArrowRight, Calendar, Users, Zap, Eye, EyeOff } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(1, { message: 'Password is required' }),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isNative, setIsNative] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
  }, []);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormValues) => {
      const response = await api.post('/auth/login', data);
      return response.data;
    },
    onSuccess: (data) => {
      localStorage.setItem('token', data.accessToken);
      router.push('/dashboard');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to login');
    },
  });

  const onSubmit = (data: LoginFormValues) => {
    setError(null);
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen w-full flex bg-background selection:bg-brand-blue/20">
      {/* Form Section - Auto adjusts for mobile and laptop */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative overflow-hidden">
        {/* Floating animated blobs behind the form box */}
        <div className="absolute top-[10%] left-[10%] w-[400px] h-[400px] bg-brand-blue/20 rounded-full mix-blend-multiply filter blur-[80px] opacity-70 animate-pulse -z-10" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[10%] right-[10%] w-[350px] h-[350px] bg-brand-purple/20 rounded-full mix-blend-multiply filter blur-[80px] opacity-70 animate-pulse -z-10" style={{ animationDuration: '10s', animationDelay: '2s' }} />
        <div className="absolute top-[40%] left-[30%] w-[300px] h-[300px] bg-brand-red/10 rounded-full mix-blend-multiply filter blur-[80px] opacity-70 animate-pulse -z-10" style={{ animationDuration: '12s', animationDelay: '4s' }} />

        <div className="w-full max-w-md space-y-8 relative z-10">
          <div className="flex flex-col space-y-2 text-center mb-8 relative z-10">
            <Link href="/" className="flex items-center gap-2 justify-center mb-6">
              <img src="/logo.png" alt="Meet Logo" className="w-10 h-10 rounded-xl object-contain shadow-lg" />
              <span className="font-extrabold text-2xl tracking-tight">Meet</span>
            </Link>
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">Welcome back</h1>
            <p className="text-muted-foreground text-sm sm:text-base font-medium">
              Enter your email and password to access your account
            </p>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl border border-white/50 dark:border-zinc-800/50 p-8 sm:p-10 rounded-3xl shadow-2xl relative z-10"
          >
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-foreground">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="name@example.com"
                  className="h-14 bg-white/50 dark:bg-zinc-950/50 border-border/50 focus:border-brand-purple focus:ring-brand-purple/20 transition-all rounded-xl text-base"
                  {...form.register('email')}
                />
                {form.formState.errors.email && (
                  <p className="text-xs text-brand-red font-bold flex items-center gap-1 mt-1">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-sm font-semibold text-foreground">Password</Label>
                  <Link href="/forgot-password" className="text-sm text-brand-blue hover:text-brand-purple font-bold transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="h-14 bg-white/50 dark:bg-zinc-950/50 border-border/50 focus:border-brand-red focus:ring-brand-red/20 transition-all rounded-xl text-base pr-12"
                    {...form.register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {form.formState.errors.password && (
                  <p className="text-xs text-brand-red font-bold flex items-center gap-1 mt-1">
                    {form.formState.errors.password.message}
                  </p>
                )}
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
                className="w-full h-14 text-lg font-black rounded-xl bg-gradient-to-r from-brand-blue to-brand-purple text-white shadow-xl shadow-brand-blue/30 hover:shadow-brand-purple/40 hover:scale-[1.02] transition-all duration-300 group mt-4"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? 'Signing in...' : (
                  <span className="flex items-center justify-center gap-2">
                    Sign In <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                )}
              </Button>

            </form>
          </motion.div>

          <div className="text-center text-sm text-muted-foreground mt-8 relative z-10 font-medium">
            Don't have an account?{' '}
            <Link href="/register" className="text-foreground hover:text-brand-purple font-bold transition-colors">
              Sign up for free
            </Link>
          </div>
        </div>
      </div>

      {/* Decorative Branding Section - Hidden on Mobile, Visible on Laptop */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-zinc-950 items-center justify-center overflow-hidden p-12">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-30" />
        
        {/* Animated Brand Blobs */}
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-brand-blue rounded-full mix-blend-screen filter blur-[100px] opacity-40 animate-pulse" style={{ animationDuration: '7s' }} />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-brand-purple rounded-full mix-blend-screen filter blur-[100px] opacity-40 animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />

        <div className="relative z-10 max-w-lg w-full space-y-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-[1.5rem] shadow-2xl flex items-center gap-4"
          >
            <div className="w-12 h-12 bg-brand-blue/20 rounded-xl flex items-center justify-center shrink-0">
              <Calendar className="w-6 h-6 text-brand-blue" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Smart Scheduling</h3>
              <p className="text-white/70 text-sm">Automate your Meets and eliminate double booking.</p>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-[1.5rem] shadow-2xl flex items-center gap-4 ml-8"
          >
            <div className="w-12 h-12 bg-brand-purple/20 rounded-xl flex items-center justify-center shrink-0">
              <Users className="w-6 h-6 text-brand-purple" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Team Coordination</h3>
              <p className="text-white/70 text-sm">Round robin and collective scheduling made easy.</p>
            </div>
          </motion.div>
          
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-white/10 backdrop-blur-xl border border-white/20 p-6 rounded-[1.5rem] shadow-2xl flex items-center gap-4 ml-16"
          >
            <div className="w-12 h-12 bg-brand-green/20 rounded-xl flex items-center justify-center shrink-0">
              <Zap className="w-6 h-6 text-brand-green" />
            </div>
            <div>
              <h3 className="text-white font-bold text-lg">Automated Workflows</h3>
              <p className="text-white/70 text-sm">Send reminders and follow-ups without thinking.</p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
