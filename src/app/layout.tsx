import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Movie Library API Training",
  description: "A REST API training platform for QA engineers."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
