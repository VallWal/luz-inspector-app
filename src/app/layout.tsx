import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Luz Inspector",
  description: "Property inspections by Luz Property Care",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover" as const,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* TEMP mobile debug: paints JS/script-load errors on screen so they
            are visible on a phone without a remote inspector. ES5 on purpose.
            Remove together with DEBUG_TOUCH once mobile is verified. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function () {
  function show(msg) {
    var el = document.getElementById("__errpanel");
    if (!el) {
      el = document.createElement("div");
      el.id = "__errpanel";
      el.style.cssText =
        "position:fixed;bottom:0;left:0;right:0;z-index:99999;background:#c05b4d;color:#fff;font:11px/1.5 monospace;padding:8px 12px;max-height:45vh;overflow:auto;white-space:pre-wrap;pointer-events:none";
      document.body.appendChild(el);
    }
    el.textContent += msg + "\\n";
  }
  window.addEventListener(
    "error",
    function (e) {
      if (e.target && (e.target.src || e.target.href)) {
        show("FAILED TO LOAD: " + (e.target.src || e.target.href));
      } else {
        show(
          "JS ERROR: " + e.message + " @ " + (e.filename || "?") + ":" + (e.lineno || "?")
        );
      }
    },
    true
  );
  window.addEventListener("unhandledrejection", function (e) {
    show("PROMISE: " + ((e.reason && e.reason.message) || e.reason));
  });
})();`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
