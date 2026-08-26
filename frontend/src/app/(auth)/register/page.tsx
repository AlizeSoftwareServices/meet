'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, ArrowRight, CheckCircle2 } from 'lucide-react';

const registerSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '' },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormValues) => {
      const response = await api.post('/auth/register', data);
      return response.data;
    },
    onSuccess: (data) => {
      localStorage.setItem('token', data.accessToken);
      router.push('/dashboard');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || 'Failed to register');
    },
  });

  const onSubmit = (data: RegisterFormValues) => {
    setError(null);
    registerMutation.mutate(data);
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
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">Create an account</h1>
            <p className="text-muted-foreground text-sm sm:text-base font-medium">
              Start accepting appointments in minutes.
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
                <Label htmlFor="name" className="text-sm font-semibold text-foreground">Full Name</Label>
                <Input
                  id="name"
                  placeholder="John Doe"
                  className="h-14 bg-white/50 dark:bg-zinc-950/50 border-border/50 focus:border-brand-blue focus:ring-brand-blue/20 transition-all rounded-xl text-base"
                  {...form.register('name')}
                />
                {form.formState.errors.name && (
                  <p className="text-xs text-brand-red font-bold flex items-center gap-1 mt-1">
                    {form.formState.errors.name.message}
                  </p>
                )}
              </div>
              
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
                <Label htmlFor="password" className="text-sm font-semibold text-foreground">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  className="h-14 bg-white/50 dark:bg-zinc-950/50 border-border/50 focus:border-brand-red focus:ring-brand-red/20 transition-all rounded-xl text-base"
                  {...form.register('password')}
                />
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
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending ? 'Creating account...' : (
                  <span className="flex items-center justify-center gap-2">
                    Sign Up <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </span>
                )}
              </Button>
            </form>
          </motion.div>

          <div className="text-center text-sm text-muted-foreground mt-8 relative z-10 font-medium">
            Already have an account?{' '}
            <Link href="/login" className="text-foreground hover:text-brand-purple font-bold transition-colors">
              Sign in here
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

        <div className="relative z-10 max-w-lg">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8 }}
            className="bg-white/10 backdrop-blur-xl border border-white/20 p-8 rounded-[2rem] shadow-2xl"
          >
            <h2 className="text-3xl font-black text-white mb-6 leading-tight">
              Join millions of professionals who schedule with Meet.
            </h2>
            <ul className="space-y-4">
              {[
                "Automate your scheduling workflows",
                "Reduce Meet no-shows instantly",
                "Integrate with your favorite tools",
                "Completely free to get started"
              ].map((item, i) => (
                <motion.li 
                  key={i}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + (i * 0.1) }}
                  className="flex items-center gap-3 text-white/80"
                >
                  <CheckCircle2 className="w-5 h-5 text-brand-green" />
                  <span className="font-medium">{item}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
