import React from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface LogoProps {
  className?: string;
}

export function Logo({ className = '' }: LogoProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <Image src="/logo.png" alt="Meet Logo" width={32} height={32} className="w-8 h-8 rounded-lg object-contain" />
      <span className="font-bold text-xl tracking-tight text-foreground">Meet</span>
    </div>
  );
}
