"use client";

import { Fragment, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { CalendarBlank, ChartBar, Database, Kanban, PlusCircle } from "@phosphor-icons/react";
import { AppShell } from "@/components/shell";
import type { NavItemView } from "@/components/view-models";
import { DataSourceProvider } from "./DataSourceProvider";
import { PersonaProvider, usePersona } from "./PersonaProvider";

const ICON = { size: 20, weight: "regular" as const };

function navItems(pathname: string): NavItemView[] {
  const isNew = pathname === "/cases/new";
  return [
    { href: "/summary", label: "Summary", icon: <ChartBar {...ICON} />, active: pathname.startsWith("/summary") },
    {
      href: "/cases",
      label: "Cases",
      icon: <Kanban {...ICON} />,
      active: !isNew && (pathname === "/cases" || pathname.startsWith("/cases/")),
    },
    { href: "/timeline", label: "Timeline", icon: <CalendarBlank {...ICON} />, active: pathname.startsWith("/timeline") },
    { href: "/data-sources", label: "Data sources", icon: <Database {...ICON} />, active: pathname.startsWith("/data-sources") },
    { href: "/cases/new", label: "New case", icon: <PlusCircle {...ICON} />, active: isNew },
  ];
}

function Frame({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? "/";
  const { personas, personaId, setPersona, epoch } = usePersona();

  return (
    <AppShell
      nav={navItems(pathname)}
      personas={personas}
      activePersonaId={personaId}
      onPersonaChange={setPersona}
    >
      {/* Keyed by persona/reset epoch: switching persona remounts views and clears cached results. */}
      <Fragment key={`${personaId}:${epoch}`}>{children}</Fragment>
    </AppShell>
  );
}

export function WorkspaceShell({ children }: { children: ReactNode }) {
  return (
    <DataSourceProvider>
      <PersonaProvider>
        <Frame>{children}</Frame>
      </PersonaProvider>
    </DataSourceProvider>
  );
}
