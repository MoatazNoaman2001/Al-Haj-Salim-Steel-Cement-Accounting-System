import type { Metadata } from "next";
import "@fontsource/cairo/400.css";
import "@fontsource/cairo/500.css";
import "@fontsource/cairo/600.css";
import "@fontsource/cairo/700.css";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

export const metadata: Metadata = {
  title: "شركة الحاج سليم - نظام الحسابات",
  description: "نظام إدارة حسابات شركة الحاج سليم لتوزيع الحديد والأسمنت",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body className="font-sans antialiased">
        <TooltipProvider>
          {children}
          <Toaster position="top-center" dir="rtl" />
        </TooltipProvider>
      </body>
    </html>
  );
}
