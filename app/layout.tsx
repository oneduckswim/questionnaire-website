import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Consumer Response Study",
  description: "Anonymous academic questionnaire about online product descriptions.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
