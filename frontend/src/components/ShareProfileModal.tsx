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
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    title={activeUrl}
                    className="flex-1 bg-transparent text-xs sm:text-sm font-medium text-foreground outline-none selection:bg-blue-500/20 truncate"
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
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448L.057 24zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                      </svg>
                    </div>
                    <span className="text-xs font-semibold">WhatsApp</span>
                  </button>

                  {/* Email */}
                  <button
                    onClick={() => openShareLink(`mailto:?subject=${encodeURIComponent(`Meeting with ${name}`)}&body=${encodeURIComponent(shareMessage)}`)}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-card hover:bg-blue-500/10 hover:border-blue-500/30 hover:text-blue-600 transition-all group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                      <Mail className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold">Email</span>
                  </button>

                  {/* LinkedIn */}
                  <button
                    onClick={() => openShareLink(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(activeUrl)}`)}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-card hover:bg-sky-500/10 hover:border-sky-500/30 hover:text-sky-600 transition-all group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-sky-500/10 text-sky-600 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z"/>
                      </svg>
                    </div>
                    <span className="text-xs font-semibold">LinkedIn</span>
                  </button>

                  {/* Native System Share */}
                  <button
                    onClick={handleNativeShare}
                    className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-card hover:bg-violet-500/10 hover:border-violet-500/30 hover:text-violet-600 transition-all group cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-full bg-violet-500/10 text-violet-600 flex items-center justify-center mb-1.5 group-hover:scale-110 transition-transform">
                      <Share2 className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-semibold">More Apps</span>
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
