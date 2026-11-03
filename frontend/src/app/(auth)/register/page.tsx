'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Sparkles, ArrowRight, CheckCircle2, Eye, EyeOff, ShieldCheck, Mail } from 'lucide-react';

const registerSchema = z.object({
  name: z.string().min(2, { message: 'Name must be at least 2 characters' }),
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormValues = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Email verification state
  const [isEmailVerified, setIsEmailVerified] = useState(false);
  const [verificationToken, setVerificationToken] = useState<string | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpValue, setOtpValue] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpSuccess, setOtpSuccess] = useState<string | null>(null);

  const form = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '' },
  });

  const emailValue = form.watch('email');

  // Cooldown countdown timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleSendOtp = async () => {
    if (!emailValue || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
      form.setError('email', { message: 'Please enter a valid email address first.' });
      return;
    }

    setIsSendingOtp(true);
    setOtpError(null);
    setOtpSuccess(null);

    try {
      const res = await api.post('/auth/send-registration-otp', { email: emailValue.trim().toLowerCase() });
      setOtpSent(true);
      setResendTimer(60);
      setOtpSuccess(res.data?.message || 'Verification code sent to your email!');
    } catch (err: any) {
      setOtpError(err.response?.data?.message || 'Failed to send verification code. Please try again.');
    } finally {
      setIsSendingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otpValue.trim().length !== 6) {
      setOtpError('Please enter the complete 6-digit code.');
      return;
    }

    setIsVerifyingOtp(true);
    setOtpError(null);

    try {
      const res = await api.post('/auth/verify-registration-otp', {
        email: emailValue.trim().toLowerCase(),
        otp: otpValue.trim(),
      });

      setIsEmailVerified(true);
      setVerificationToken(res.data.verificationToken);
      setOtpSuccess('Email verified successfully!');
      setOtpSent(false);
    } catch (err: any) {
      setOtpError(err.response?.data?.message || 'Invalid or expired OTP code.');
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormValues) => {
      if (!isEmailVerified || !verificationToken) {
        throw new Error('Please verify your email with OTP before signing up.');
      }
      const { confirmPassword, ...registerData } = data;
      const response = await api.post('/auth/register', {
        ...registerData,
        email: registerData.email.trim().toLowerCase(),
        verificationToken,
      });
      return response.data;
    },
    onSuccess: (data) => {
      localStorage.setItem('token', data.accessToken);
      router.push('/dashboard');
    },
    onError: (err: any) => {
      setError(err.response?.data?.message || err.message || 'Failed to register');
    },
  });

  const onSubmit = (data: RegisterFormValues) => {
    setError(null);
    if (!isEmailVerified) {
      setError('Please click "Verify Email" to verify your email address before creating an account.');
      return;
    }
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
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground">
              Create an account
            </h1>
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
              
              {/* Email with Verify Button */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="email" className="text-sm font-semibold text-foreground">Email</Label>
                  {isEmailVerified && (
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full animate-in fade-in">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Verified
                    </span>
                  )}
                </div>

                <div className="relative flex items-center">
                  <Input
                    id="email"
                    type="email"
                    disabled={isEmailVerified}
                    placeholder="name@example.com"
                    className={`h-14 bg-white/50 dark:bg-zinc-950/50 border-border/50 focus:border-brand-purple focus:ring-brand-purple/20 transition-all rounded-xl text-base pr-32 ${
                      isEmailVerified ? 'border-emerald-500/50 bg-emerald-500/5 text-emerald-950 dark:text-emerald-200' : ''
                    }`}
                    {...form.register('email', {
                      onChange: () => {
                        if (isEmailVerified) {
                          setIsEmailVerified(false);
                          setVerificationToken(null);
                        }
                      }
                    })}
                  />
                  
                  <div className="absolute right-2.5 flex items-center">
                    {isEmailVerified ? (
                      <button
                        type="button"
                        onClick={() => {
                          setIsEmailVerified(false);
                          setVerificationToken(null);
                          setOtpSent(false);
                          setOtpValue('');
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground font-semibold px-2 py-1 underline transition-colors"
                      >
                        Change
                      </button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        disabled={isSendingOtp || !emailValue}
                        onClick={handleSendOtp}
                        className="h-9 px-3 rounded-lg text-xs font-bold bg-brand-purple hover:bg-brand-purple/90 text-white shadow-sm transition-all"
                      >
                        {isSendingOtp ? 'Sending...' : otpSent ? 'Resend Code' : 'Verify Email'}
                      </Button>
                    )}
                  </div>
                </div>

                {form.formState.errors.email && (
                  <p className="text-xs text-brand-red font-bold flex items-center gap-1 mt-1">
                    {form.formState.errors.email.message}
                  </p>
                )}
              </div>

              {/* Inline OTP Input Box */}
              <AnimatePresence>
                {otpSent && !isEmailVerified && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, y: -8 }}
                    animate={{ opacity: 1, height: 'auto', y: 0 }}
                    exit={{ opacity: 0, height: 0, y: -8 }}
                    transition={{ duration: 0.3 }}
                    className="p-4 bg-purple-500/5 border border-purple-500/20 rounded-2xl space-y-3 overflow-hidden"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-foreground flex items-center gap-1.5">
                        <Mail className="w-3.5 h-3.5 text-brand-purple" />
                        Enter 6-digit code sent to your email:
                      </span>
                      {resendTimer > 0 ? (
                        <span className="text-muted-foreground font-medium">Resend in {resendTimer}s</span>
                      ) : (
                        <button
                          type="button"
                          onClick={handleSendOtp}
                          disabled={isSendingOtp}
                          className="text-brand-purple hover:underline font-bold"
                        >
                          Resend Code
                        </button>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <Input
                        type="text"
                        maxLength={6}
                        value={otpValue}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setOtpValue(val);
                          setOtpError(null);
                        }}
                        placeholder="123456"
                        className="h-11 tracking-[0.4em] text-center font-mono font-bold text-lg rounded-xl bg-white dark:bg-zinc-950 border-purple-500/30 focus:border-brand-purple"
                      />
                      <Button
                        type="button"
                        disabled={isVerifyingOtp || otpValue.length !== 6}
                        onClick={handleVerifyOtp}
                        className="h-11 px-5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md text-xs shrink-0"
                      >
                        {isVerifyingOtp ? 'Checking...' : 'Verify'}
                      </Button>
                    </div>

                    {otpError && (
                      <p className="text-xs text-brand-red font-bold">{otpError}</p>
                    )}
                    {otpSuccess && (
                      <p className="text-xs text-emerald-600 font-bold">{otpSuccess}</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
              
              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-foreground">Password</Label>
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

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-semibold text-foreground">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="h-14 bg-white/50 dark:bg-zinc-950/50 border-border/50 focus:border-brand-red focus:ring-brand-red/20 transition-all rounded-xl text-base pr-12"
                    {...form.register('confirmPassword')}
                  />
                </div>
                {form.formState.errors.confirmPassword && (
                  <p className="text-xs text-brand-red font-bold flex items-center gap-1 mt-1">
                    {form.formState.errors.confirmPassword.message}
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

              {/* Sign Up Button: Only active when email is verified */}
              <Button
                type="submit"
                disabled={!isEmailVerified || registerMutation.isPending}
                className={`w-full h-14 text-lg font-black rounded-xl text-white shadow-xl transition-all duration-300 group mt-4 ${
                  !isEmailVerified 
                    ? 'bg-zinc-400 dark:bg-zinc-700 cursor-not-allowed opacity-60' 
                    : 'bg-gradient-to-r from-brand-blue to-brand-purple shadow-brand-blue/30 hover:shadow-brand-purple/40 hover:scale-[1.02]'
                }`}
              >
                {registerMutation.isPending ? 'Creating account...' : (
                  <span className="flex items-center justify-center gap-2">
                    {!isEmailVerified ? (
                      <>Verify Email to Sign Up</>
                    ) : (
                      <>
                        Sign Up <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
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
        
        <div className="relative z-10 max-w-lg text-white space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold uppercase tracking-wider text-brand-purple">
            <Sparkles className="w-4 h-4" /> Next-Gen Scheduling Platform
          </div>
          <h2 className="text-4xl font-extrabold tracking-tight leading-tight">
            Seamless Calendar Sync & Instant Meetings
          </h2>
          <p className="text-zinc-400 text-lg leading-relaxed">
            Eliminate double bookings forever with real-time two-way calendar sync, intelligent round-robin team scheduling, and automated workflows.
          </p>
        </div>
      </div>
    </div>
  );
}
