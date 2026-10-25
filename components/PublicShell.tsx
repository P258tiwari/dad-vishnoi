import type { ReactNode } from "react";
import { Analytics } from "./Analytics";
import { PingProvider } from "./PingExperience";

export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <PingProvider>
      {children}
      <Analytics />
    </PingProvider>
  );
}
