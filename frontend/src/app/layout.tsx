import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "../providers/query-provider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Meet | Modern Scheduling for Professionals",
  description: "Join millions of professionals who easily book meetings and automate their workflows with Meet, the ultimate scheduling tool.",
  keywords: ["scheduling", "meetings", "calendar", "productivity", "time management", "appointment booking", "Meet", "Alize Software Services"],
  authors: [{ name: "Alize Software Services LLP" }],
  openGraph: {
    title: "Meet | Modern Scheduling for Professionals",
    description: "Easily book meetings and automate your workflows with Meet.",
    url: "https://meet.alizesoftwareservices.com",
    siteName: "Meet",
    images: [
      {
        url: "https://meet.alizesoftwareservices.com/logo.png", 
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
    images: ["https://meet.alizesoftwareservices.com/logo.png"],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} overflow-x-hidden`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
