import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import {
  AuthProvider,
  ThemeProvider,
  I18nProvider,
} from "@/components/providers";
import { ReduxProvider } from "@/store/ReduxProvider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Panaflex House - Management System",
  description: "Complete management system for Panaflex House business",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} antialiased`}>
        <AuthProvider>
          <ReduxProvider>
            <ThemeProvider>
              <I18nProvider>{children}</I18nProvider>
            </ThemeProvider>
          </ReduxProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
