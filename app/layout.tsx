import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Questionnaire Insights",
  description: "Secure research questionnaire analytics dashboard.",
  robots: { index: false, follow: false },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="zh-CN"><body>{children}</body></html>;
}
