import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AquaShield AI | Southwest Delta Coastal Salinity Forecast",
  description: "Physically grounded estuarine salinity forecasting and civic early-warning dashboard.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-slate-950 text-slate-100 min-h-screen">
        {children}
      </body>
    </html>
  );
}