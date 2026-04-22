import { copy } from "@/lib/copy";

interface PublicShellProps {
    children: React.ReactNode;
    orgName?: string;
}

// Minimal public-facing shell. No sidebar, no auth gate. Just a header
// with the brand + the org being viewed. Content fills the viewport so
// the board view can spread its status columns the same way the authed
// Shell does.
export function PublicShell({ children, orgName }: PublicShellProps) {
    return (
        <div className="flex min-h-screen flex-col bg-background text-foreground">
            <header className="border-b border-border/50">
                <div className="flex items-center justify-between px-4 py-3 sm:px-6">
                    <div className="flex items-baseline gap-2">
                        <span className="text-lg font-bold tracking-tight text-primary">
                            {copy.brand.name}
                        </span>
                        {orgName && (
                            <span className="text-sm text-muted-foreground">
                                · {orgName}
                            </span>
                        )}
                    </div>
                    <span className="text-[11px] italic text-muted-foreground">
                        {copy.brand.tagline}
                    </span>
                </div>
            </header>
            <main className="flex-1 overflow-y-auto p-4 sm:p-6">
                {children}
            </main>
        </div>
    );
}
