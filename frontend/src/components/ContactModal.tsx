'use client';

import { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName?: string;
}

export function ContactModal({ isOpen, onClose, productName = 'Meet' }: ContactModalProps) {
  const [accountType, setAccountType] = useState<'Company' | 'Individual'>('Company');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    company: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const payload = {
      product_name: productName,
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      account_type: accountType,
      company_name: accountType === 'Company' ? formData.company : null,
      message: formData.message
    };

    try {
      // 1. Send data to Google Apps Script (For Google Sheets + Email)
      const appsScriptPayload = {
        formType: 'Product Leads',
        product_name: productName,
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        account_type: accountType,
        company_name: accountType === 'Company' ? formData.company : "N/A",
        message: formData.message
      };

      const scriptPromise = fetch("https://script.google.com/macros/s/AKfycbyV6PvEtyNg4LzWeD7ge20LZowSZdeiifOvdeXbC9WaWg7yc9pf2BPViUsiby_asSzkMA/exec", {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(appsScriptPayload)
      });

      // 2. Send data directly to Firebase Firestore (For Thala Admin Dashboard)
      const firestorePayload = {
        fields: {
          formType: { stringValue: "ProductLead" },
          product_name: { stringValue: productName },
          name: { stringValue: formData.name },
          email: { stringValue: formData.email },
          phone: { stringValue: formData.phone },
          account_type: { stringValue: accountType },
          company_name: { stringValue: accountType === 'Company' ? formData.company : "" },
          message: { stringValue: formData.message },
          timestamp: { timestampValue: new Date().toISOString() }
        }
      };

      const firestorePromise = fetch("https://firestore.googleapis.com/v1/projects/alizewebsite-a9faa/databases/(default)/documents/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(firestorePayload)
      });

      // Execute both requests concurrently
      await Promise.all([scriptPromise, firestorePromise]);
      
      alert('Thank you! Your application has been submitted successfully.');
      onClose();
    } catch (error) {
      console.error('Error submitting form:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-background border-border/50 shadow-2xl rounded-[1.5rem]">
        <div className="h-2 w-full bg-gradient-to-r from-brand-blue via-brand-purple to-brand-red" />
        
        <div className="p-8">
          <DialogHeader className="mb-6">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-brand-blue" />
              </div>
              <DialogTitle className="text-2xl font-black">Interested in {productName}?</DialogTitle>
            </div>
            <DialogDescription className="text-muted-foreground text-base">
              Leave your details below and we'll reach out to help you get started.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Full Name</Label>
                <Input 
                  id="name"
                  placeholder="John Doe" 
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                  required 
                  className="h-11 rounded-xl bg-muted/30 border-border/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Mobile Number</Label>
                <Input 
                  id="phone"
                  type="tel"
                  placeholder="+91 98765 43210" 
                  value={formData.phone}
                  onChange={e => {
                    // Only allow numbers, spaces, and plus sign
                    const val = e.target.value.replace(/[^\d\s+]/g, '');
                    setFormData({...formData, phone: val});
                  }}
                  required 
                  className="h-11 rounded-xl bg-muted/30 border-border/50"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Email Address</Label>
              <Input 
                id="email"
                type="email"
                placeholder="john@example.com" 
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                pattern="[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
                title="Please enter a valid email address with a domain (e.g., name@gmail.com)"
                required 
                className="h-11 rounded-xl bg-muted/30 border-border/50"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Who is this for?</Label>
              <div className="flex bg-muted/30 p-1 rounded-xl border border-border/50">
                <button
                  type="button"
                  onClick={() => setAccountType('Company')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${accountType === 'Company' ? 'bg-background shadow-sm text-brand-blue border border-brand-blue/20' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Company / Team
                </button>
                <button
                  type="button"
                  onClick={() => setAccountType('Individual')}
                  className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${accountType === 'Individual' ? 'bg-background shadow-sm text-brand-blue border border-brand-blue/20' : 'text-muted-foreground hover:text-foreground'}`}
                >
                  Individual
                </button>
              </div>
            </div>

            {accountType === 'Company' && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-200">
                <Label htmlFor="company" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Company Name</Label>
                <Input 
                  id="company"
                  placeholder="Acme Corp" 
                  value={formData.company}
                  onChange={e => setFormData({...formData, company: e.target.value})}
                  required 
                  className="h-11 rounded-xl bg-muted/30 border-border/50"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="message" className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Message (Optional)</Label>
              <Textarea 
                id="message"
                placeholder="Tell us about your requirements or features you are looking for..." 
                value={formData.message}
                onChange={e => setFormData({...formData, message: e.target.value})}
                className="min-h-[100px] resize-none rounded-xl bg-muted/30 border-border/50"
              />
            </div>

            <div className="pt-2">
              <Button 
                type="submit" 
                disabled={isSubmitting}
                className="w-full h-12 rounded-xl text-base font-bold bg-gradient-to-r from-brand-blue to-brand-purple hover:opacity-90 transition-opacity shadow-lg shadow-brand-blue/20"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Request'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
