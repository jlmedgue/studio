import type {Metadata} from 'next';
import { GeistSans } from 'geist/font/sans';
import './globals.css';
import { Toaster } from "@/components/ui/toaster"; // Import Toaster

export const metadata: Metadata = {
  title: 'Task Tracker Pro',
  description: 'Manage your tasks efficiently',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning> {/* suppressHydrationWarning is necessary for theme toggle */}
      <body className={`${GeistSans.variable} font-sans antialiased`}>
        <main>{children}</main>
        <Toaster /> {/* Add Toaster component here */}
      </body>
    </html>
  );
}
