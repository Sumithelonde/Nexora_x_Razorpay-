import type { Metadata } from "next";
import "./globals.css";


export const metadata: Metadata = {
  title: "Agentic Commerce",
  description:
    "AI powered multi-merchant commerce platform",
};


type RootLayoutProps = {
  children: React.ReactNode;
};


export default function RootLayout({
  children,
}: RootLayoutProps) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
    >
      <body>
        {children}
      </body>
    </html>
  );
}