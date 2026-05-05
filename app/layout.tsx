import type { Metadata } from "next";
import "./globals.css";
import { NavigationBar } from "./components/NavigationBar";
import { Providers } from "./components/Providers";

export const metadata: Metadata = {
  title: "Axceal",
  description: "Axceal Store",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`min-h-screen flex flex-col`}>
        <Providers>
          <NavigationBar />
          {children}
        </Providers>
      </body>
    </html>
  );
}
