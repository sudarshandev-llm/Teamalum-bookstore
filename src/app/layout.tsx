import type { Metadata } from "next";
import { Geist, Inter } from "next/font/google";
import { ThemeProvider } from "next-themes";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Prompt Engineering Blueprint — Team Alum Publishing",
  description:
    "The definitive guide to mastering prompt engineering. Learn systematic techniques, advanced patterns, and real-world strategies for crafting effective AI prompts.",
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Book",
  name: "Prompt Engineering Blueprint",
  author: "Team Alum Publishing",
  description:
    "The definitive guide to mastering prompt engineering with systematic techniques, advanced patterns, and real-world strategies.",
  publisher: {
    "@type": "Organization",
    name: "Team Alum Publishing",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${inter.variable} font-sans antialiased min-h-screen flex flex-col`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
