"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { List } from "@phosphor-icons/react";
import { Drawer } from "@/components/ui/Drawer";
import type { AppShellProps, NavItemView } from "@/components/view-models";
import { PersonaSwitcher } from "./PersonaSwitcher";
import { ThemeToggle } from "./ThemeToggle";
import styles from "./AppShell.module.css";

export type { AppShellProps };

const MAIN_ID = "main-content";

function NavLink({ item }: { item: NavItemView }) {
  return (
    <Link
      href={item.href}
      className={[styles.navLink, item.active ? styles.navActive : undefined].filter(Boolean).join(" ")}
      aria-current={item.active ? "page" : undefined}
    >
      {item.icon ? (
        <span className={styles.navIcon} aria-hidden="true">
          {item.icon}
        </span>
      ) : null}
      <span className={styles.navLabel}>{item.label}</span>
    </Link>
  );
}

/**
 * Workspace shell.
 * Desktop (>= 1024): sidebar with brand, user, role, nav and theme control.
 * Tablet (768-1023): narrower rail with labels.
 * Mobile (< 768): menu opens navigation drawer containing the role selector.
 */
export function AppShell({
  nav,
  personas,
  activePersonaId,
  onPersonaChange,
  children,
}: AppShellProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const role = <PersonaSwitcher personas={personas} activePersonaId={activePersonaId} onChange={onPersonaChange} />;
  const user = <div className={styles.user} aria-label="Current user"><Image className={styles.userAvatar} src="/avatars/user-02a.svg" alt="" width={32} height={32} /><span><span className={styles.userLabel}>User</span><strong>Superadmin</strong></span></div>;
  return (
    <div className={styles.shell}>
      <a href={`#${MAIN_ID}`} className="skip-link">
        Skip to main content
      </a>

      <aside className={styles.sidebar} aria-label="Workspace">
        <div className={styles.brand}>
          <Image
            className={styles.brandLogo}
            src="/company-logo.png"
            alt="Chandra Daya Investasi"
            width={212}
            height={70}
            priority
          />
          <span className={styles.workspace}>Manufacturing intelligence workspace</span>
        </div>

        {user}

        <div className={styles.sidebarRole}>{role}</div>

        <nav className={styles.nav} aria-label="Primary">
          <ul className={styles.navList}>
            {nav.map((item) => (
              <li key={item.href} className={styles.navItem}>
                <NavLink item={item} />
              </li>
            ))}
          </ul>
        </nav>

        <ThemeToggle />

      </aside>

      <Drawer open={menuOpen} title="Workspace" onClose={() => setMenuOpen(false)}>
        <div className={styles.mobileMenu}>
          {user}
          {role}
          <nav aria-label="Mobile navigation" onClick={() => setMenuOpen(false)}>
            <ul className={styles.navList}>{nav.map(item => <li key={item.href}><NavLink item={item} /></li>)}</ul>
          </nav>
          <ThemeToggle />
        </div>
      </Drawer>
      <div className={styles.column}>
        <header className={styles.topbar}>
          <Image
            className={styles.topBrandLogo}
            src="/company-logo.png"
            alt="Chandra Daya Investasi"
            width={151}
            height={50}
            priority
          />
          <button type="button" className={styles.menuButton} aria-label="Open navigation and role" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><List size={20} aria-hidden="true" /> Menu</button>
        </header>



        <main id={MAIN_ID} tabIndex={-1} className={styles.main}>
          {children}
        </main>
      </div>
    </div>
  );
}
