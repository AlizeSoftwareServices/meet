'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Copy, 
  Check, 
  Share2, 
  ExternalLink, 
  Mail, 
  MessageCircle, 
  Globe, 
  Sparkles,
  Smartphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ShareProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: {
    name?: string;
    username?: string;
    avatar?: string;
  };
}

export default function ShareProfileModal({ isOpen, onClose, profile }: ShareProfileModalProps) {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const username = profile?.username || 'me';
  const name = profile?.name || 'My';
  
  // Construct clean public booking URL
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://meet.alizesoftwareservices.com';
  const bookingUrl = `${origin}/book/${username}`;
  const shareMessage = `Book a meeting with ${name} on Meet: ${bookingUrl}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(bookingUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${name}'s Booking Page - Meet`,
          text: `Schedule a meeting with ${name}:`,
          url: bookingUrl,
        });
      } catch (err) {
        // User cancelled or share failed
        console.log('Share dismissed');
      }
    } else {
      handleCopy();
    }
  };

  const openShareLink = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 10 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 10 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-lg bg-card text-card-foreground border border-border shadow-2xl rounded-2xl p-6 sm:p-7 overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Share Your Profile Link</h2>
                <p className="text-xs text-muted-foreground">Anyone with this link can book open slots with you</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Profile Card */}
          <div className="mt-5 p-3.5 rounded-xl bg-muted/50 border border-border/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 shadow-sm">
                {(name || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <h3 className="font-semibold text-sm truncate">{name}</h3>
                <p className="text-xs text-muted-foreground font-mono truncate">
                  /book/{username}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.open(bookingUrl, '_blank')}
              className="text-xs shrink-0 gap-1.5 hover:text-blue-600"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Preview
            </Button>
          </div>

          {/* Copy URL Box */}
          <div className="mt-4 space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Public Booking URL
            </label>
            <div className="flex items-center gap-2 p-1.5 pl-3 rounded-xl border border-border bg-background focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
              <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
              <input
                type="text"
                readOnly
                value={bookingUrl}
                className="flex-1 bg-transparent text-sm text-foreground outline-none font-mono selection:bg-blue-500/20 truncate"
              />
              <Button
                size="sm"
                onClick={handleCopy}
                className={`rounded-lg px-3.5 font-medium transition-all gap-1.5 shrink-0 ${
                  copied 
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                    : 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                }`}
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copy Link
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Share Channels */}
          <div className="mt-5 space-y-2.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Share Directly
            </label>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* WhatsApp */}
              <button
                onClick={() => openShareLink(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareMessage)}`)}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-card hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-600 transition-all group"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                  <MessageCircle className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium">WhatsApp</span>
              </button>

              {/* Email */}
              <button
                onClick={() => openShareLink(`mailto:?subject=${encodeURIComponent(`Meeting with ${name}`)}&body=${encodeURIComponent(shareMessage)}`)}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-card hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-600 transition-all group"
              >
                <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                  <Mail className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium">Email</span>
              </button>

              {/* LinkedIn */}
              <button
                onClick={() => openShareLink(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(bookingUrl)}`)}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-card hover:bg-sky-500/10 hover:border-sky-500/30 hover:text-sky-600 transition-all group"
              >
                <div className="w-8 h-8 rounded-full bg-sky-500/10 text-sky-600 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                  <Share2 className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium">LinkedIn</span>
              </button>

              {/* Native System Share */}
              <button
                onClick={handleNativeShare}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-card hover:bg-violet-500/10 hover:border-violet-500/30 hover:text-violet-600 transition-all group"
              >
                <div className="w-8 h-8 rounded-full bg-violet-500/10 text-violet-600 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                  <Smartphone className="w-4 h-4" />
                </div>
                <span className="text-xs font-medium">More Apps</span>
              </button>
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-6 pt-4 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Synced with your real-time availability
            </span>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-7 text-xs">
              Done
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
