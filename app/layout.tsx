import type { Metadata, Viewport } from "next";
import "./globals.css";
import PwaRegister from "@/components/PwaRegister";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";

export const metadata: Metadata = {
    title: "SecretChat",
    description: "Encrypted Private Audio Calls & Zero-Knowledge Messaging",
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
            <body>
                <PwaRegister />
                {children}
                <PwaInstallPrompt />
            </body>
        </html>
    );
}
