'use client';

import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Copy, 
  Check, 
  Share2, 
  Mail, 
  MessageCircle, 
  Globe, 
  Sparkles,
  Smartphone,
  QrCode,
  Download
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { QRCodeCanvas } from 'qrcode.react';
import { shareMeetingLink } from '@/lib/nativeShare';
import { triggerHaptic } from '@/lib/haptics';

interface ShareProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  profile?: {
    name?: string;
    username?: string;
    avatar?: string;
    shortCode?: string;
  };
  initialTab?: 'link' | 'qr';
}

export default function ShareProfileModal({ isOpen, onClose, profile, initialTab = 'link' }: ShareProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'link' | 'qr'>(initialTab);
  const [copied, setCopied] = useState(false);
  const [qrDownloaded, setQrDownloaded] = useState(false);
  const qrRef = useRef<HTMLDivElement>(null);

  if (!isOpen) return null;

  const username = profile?.username || 'me';
  const name = profile?.name || 'My';
  
  // Construct URLs
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://meet.alizesoftwareservices.com';
  const fullBookingUrl = `${origin}/book/${username}`;
  const activeUrl = fullBookingUrl;
  const shareMessage = `Book a meeting with ${name} on Meet: ${activeUrl}`;

  const handleCopy = async () => {
    try {
      triggerHaptic('light');
      await navigator.clipboard.writeText(activeUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleDownloadQr = () => {
    try {
      triggerHaptic('medium');
      const canvas = document.getElementById('profile-qr-canvas') as HTMLCanvasElement;
      if (!canvas) return;

      const pngUrl = canvas.toDataURL('image/png');
      const downloadLink = document.createElement('a');
      downloadLink.href = pngUrl;
      downloadLink.download = `${username}-meet-qr.png`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);

      setQrDownloaded(true);
      setTimeout(() => setQrDownloaded(false), 2500);
    } catch (err) {
      console.error('Failed to download QR code', err);
    }
  };

  const handleNativeShare = async () => {
    triggerHaptic('medium');
    const shared = await shareMeetingLink({
      title: `${name}'s Booking Page - Meet`,
      text: `Schedule a meeting with ${name}:`,
      url: activeUrl,
      dialogTitle: 'Share your booking profile'
    });
    if (!shared) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
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
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
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
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Share2 className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Share Your Profile</h2>
                <p className="text-xs text-muted-foreground">Anyone with this link or QR can book open slots with you</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation Tabs: Link vs QR Code with high-contrast active blue indicator */}
          <div className="flex items-center gap-1.5 mt-4 p-1.5 rounded-xl bg-muted/60 border border-border">
            <button
              onClick={() => { triggerHaptic('light'); setActiveTab('link'); }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'link'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-1 ring-blue-700'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              Booking Link
            </button>
            <button
              onClick={() => { triggerHaptic('light'); setActiveTab('qr'); }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === 'qr'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/25 ring-1 ring-blue-700'
                  : 'text-muted-foreground hover:text-foreground hover:bg-background/60'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              QR Code
            </button>
          </div>

          {activeTab === 'link' ? (
            /* TAB 1: Booking Link */
            <div className="animate-in fade-in duration-200">
              {/* User Profile Card */}
              <div className="mt-4 p-3.5 rounded-xl bg-muted/40 border border-border/80 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-bold flex items-center justify-center shrink-0 shadow-sm">
                  {(name || 'U').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-sm truncate">{name}</h3>
                  <p className="text-xs text-muted-foreground font-mono truncate">
                    /book/{username}
                  </p>
                </div>
              </div>

              {/* Copy URL Box */}
              <div className="mt-4 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Public Booking URL
                  </label>
                </div>

                <div className="flex items-center gap-2 p-1.5 pl-3 rounded-xl border border-border bg-background focus-within:ring-2 focus-within:ring-blue-500/20 focus-within:border-blue-500 transition-all">
                  <Globe className="w-4 h-4 text-muted-foreground shrink-0" />
                  <input
                    type="text"
                    readOnly
                    value={activeUrl}
                    className="flex-1 bg-transparent text-sm text-foreground outline-none font-mono selection:bg-blue-500/20 truncate"
                  />
                  <Button
                    size="sm"
                    onClick={handleCopy}
                    className={`rounded-lg px-3.5 font-medium transition-all gap-1.5 shrink-0 cursor-pointer ${
                      copied 
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                        : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
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
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-card hover:bg-emerald-500/10 hover:border-emerald-500/30 hover:text-emerald-600 transition-all group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-medium">WhatsApp</span>
                  </button>

                  {/* Email */}
                  <button
                    onClick={() => openShareLink(`mailto:?subject=${encodeURIComponent(`Meeting with ${name}`)}&body=${encodeURIComponent(shareMessage)}`)}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-card hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-600 transition-all group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                      <Mail className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-medium">Email</span>
                  </button>

                  {/* LinkedIn */}
                  <button
                    onClick={() => openShareLink(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(activeUrl)}`)}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-card hover:bg-sky-500/10 hover:border-sky-500/30 hover:text-sky-600 transition-all group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-sky-500/10 text-sky-600 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                      <Share2 className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-medium">LinkedIn</span>
                  </button>

                  {/* Native System Share */}
                  <button
                    onClick={handleNativeShare}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-card hover:bg-violet-500/10 hover:border-violet-500/30 hover:text-violet-600 transition-all group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-violet-500/10 text-violet-600 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-medium">More Apps</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: Permanent QR Code */
            <div className="mt-4 flex flex-col items-center text-center animate-in fade-in duration-200">
              <div 
                ref={qrRef}
                className="p-5 bg-white rounded-2xl border border-border/80 shadow-md flex flex-col items-center justify-center"
              >
                <QRCodeCanvas
                  id="profile-qr-canvas"
                  value={fullBookingUrl}
                  size={200}
                  level="H"
                  includeMargin={true}
                  className="rounded-lg"
                />
                <div className="mt-2 text-center">
                  <p className="text-xs font-bold text-zinc-900 tracking-tight">{name}</p>
                  <p className="text-[10px] font-mono text-zinc-500">meet.alizesoftwareservices.com/book/{username}</p>
                </div>
              </div>

              <p className="text-xs text-muted-foreground mt-3 max-w-xs">
                Scan this QR code with any camera or phone to instantly open your booking calendar.
              </p>

              {/* Download and Copy Actions */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 mt-4 w-full">
                <Button
                  onClick={handleDownloadQr}
                  className="flex-1 rounded-xl h-10 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs gap-1.5 shadow-sm cursor-pointer"
                >
                  {qrDownloaded ? (
                    <>
                      <Check className="w-4 h-4" />
                      Downloaded PNG!
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      Download QR Code (PNG)
                    </>
                  )}
                </Button>

                <Button
                  variant="outline"
                  onClick={handleCopy}
                  className="rounded-xl h-10 text-xs font-semibold gap-1.5 border-border hover:bg-secondary cursor-pointer shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      Copied Link!
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
          )}

          {/* Footer Note */}
          <div className="mt-6 pt-3.5 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Permanent link & QR for your account
            </span>
            <Button variant="ghost" size="sm" onClick={onClose} className="h-7 text-xs cursor-pointer">
              Done
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
