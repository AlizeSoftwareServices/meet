import type { Metadata, Viewport } from "next";
import { Outfit, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Providers from "../providers/query-provider";

const outfit = Outfit({ 
  subsets: ["latin"], 
  variable: "--font-outfit",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

const jakarta = Plus_Jakarta_Sans({ 
  subsets: ["latin"], 
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL("https://meet.alizesoftwareservices.com"),
  title: {
    default: "Meet | Modern Scheduling for Professionals",
    template: "%s | Meet",
  },
  description: "Join millions of professionals who easily book meetings and automate their workflows with Meet, the ultimate scheduling tool.",
  keywords: ["scheduling", "meetings", "calendar", "productivity", "time management", "appointment booking", "Meet", "Google Meet integration", "Alize Software Services"],
  authors: [{ name: "Alize Software Services LLP", url: "https://www.alizesoftwareservices.com" }],
  creator: "Alize Software Services LLP",
  publisher: "Alize Software Services LLP",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  alternates: {
    canonical: "https://meet.alizesoftwareservices.com",
  },
  openGraph: {
    title: "Meet | Modern Scheduling for Professionals",
    description: "Easily book meetings and automate your workflows with Meet.",
    url: "https://meet.alizesoftwareservices.com",
    siteName: "Meet",
    images: [
      {
        url: "/logo.png", 
        width: 1200,
        height: 630,
        alt: "Meet Scheduling Platform",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Meet | Modern Scheduling for Professionals",
    description: "Easily book meetings and automate your workflows with Meet.",
    images: ["/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${outfit.variable} ${jakarta.variable} font-sans overflow-x-hidden antialiased gpu-layer`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
