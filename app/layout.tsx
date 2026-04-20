import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { NavigationBar } from "./components/NavigationBar";

// const fustat = localFont({
//   src: [
//     { path: "../public/fonts/fustat webfonts/fustat-latin-400-normal.woff2", weight: "400" },
//     { path: "../public/fonts/fustat webfonts/fustat-latin-500-normal.woff2", weight: "500" },
//     { path: "../public/fonts/fustat webfonts/fustat-latin-600-normal.woff2", weight: "600" },
//     { path: "../public/fonts/fustat webfonts/fustat-latin-700-normal.woff2", weight: "700" },
//     { path: "../public/fonts/fustat webfonts/fustat-latin-800-normal.woff2", weight: "800" },
//   ],
//   display: "swap",
//   preload: true,
// });

export const metadata: Metadata = {
  title: "Axceal",
  description: "Be unconstrained in all you do. The Aero x1 by Axceal.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`min-h-screen flex flex-col`}>
        <NavigationBar />
        {children}
      </body>
    </html>
  );
}
