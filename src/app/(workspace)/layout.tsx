import type { ReactNode } from "react";
import "@/styles/tokens.css";
import "@/styles/base.css";
import { WorkspaceShell } from "@/components/features/WorkspaceShell";

export default function WorkspaceLayout({ children }: { children: ReactNode }) {
  return <WorkspaceShell>{children}</WorkspaceShell>;
}
