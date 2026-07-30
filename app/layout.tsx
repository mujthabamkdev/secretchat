import type { Metadata, Viewport } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";

const outfit = Outfit({
    subsets: ["latin"],
    weight: ["400", "600", "800", "900"],
    variable: "--font-outfit"
});

export const metadata: Metadata = {
    title: "SecretChat | Private Communication, Reimagined",
    description: "End-to-End Encrypted Private Communication, Audio Calls & Zero-Knowledge Messaging",
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "SecretChat",
    },
    icons: {
        icon: "/icon.svg",
        apple: "/icon.svg",
    },
};

export const viewport: Viewport = {
    themeColor: "#0a0a0a",
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body className={outfit.className}>
                <PwaRegister />
                {children}
                <PwaInstallPrompt />
            </body>
        </html>
    );
}
