import '../styles/globals.css';
import { googleSans } from '../lib/fonts';
import { ThemeProvider } from '../providers/ThemeProvider';
import { QueryProvider } from '../providers/QueryProvider';
import { ThemeToggle } from '../components/ui/ThemeToggle';
import { FileSpreadsheet } from 'lucide-react';

export const metadata = {
  title: 'GrowEasy CRM | AI CSV Importer',
  description: 'Upload arbitrary CSV files and parse them into GrowEasy CRM format using AI mapping.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={googleSans.variable}>
      <body className="min-h-screen flex flex-col bg-background text-on-background antialiased">
        <QueryProvider>
          <ThemeProvider>
            {/* Header */}
            <header className="sticky top-0 z-40 w-full bg-surface/80 backdrop-blur-md border-b border-border/40">
              <div className="max-w-[1440px] mx-auto px-6 h-16 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="text-base font-bold tracking-tight leading-none text-on-background">
                      GrowEasy
                    </h1>
                    <span className="text-xs text-on-surface/50 font-medium">
                      AI CSV Importer
                    </span>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4">
                  <ThemeToggle />
                </div>
              </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 max-w-[1440px] w-full mx-auto px-6 py-8">
              {children}
            </main>

            {/* Footer */}
            <footer className="w-full border-t border-border/40 bg-surface/50 py-6">
              <div className="max-w-[1440px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between text-xs text-on-surface/40 font-medium">
                <p>GrowEasy CRM — Intern Assignment</p>
                <div className="flex space-x-4 mt-2 md:mt-0">
                  <span className="text-on-surface/30">AI-Powered CSV Importer</span>
                </div>
              </div>
            </footer>
          </ThemeProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
