import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "SecretChat",
    description: "The exclusive network for private video connections.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body>
                {children}
            </body>
        </html>
    );
}
