"use client";

import { X } from "@phosphor-icons/react";
import { useEffect, useId, useRef } from "react";
import type { MouseEvent, ReactNode, SyntheticEvent } from "react";
import { Button } from "./Button";
import styles from "./Drawer.module.css";

export interface DrawerProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** Visible text of the close button. Defaults to "Close". */
  closeLabel?: string;
}

/**
 * Side drawer on a native modal <dialog>. The parent owns `open`; Escape,
 * the close button and a backdrop click all call `onClose`. Focus moves into
 * the drawer on open and returns to the opener on close.
 */
export function Drawer({ open, title, onClose, children, closeLabel = "Close" }: DrawerProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      returnFocusRef.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      dialog.showModal();
      closeRef.current?.focus();
      document.documentElement.style.overflow = "hidden";
    } else if (!open && dialog.open) {
      dialog.close();
    }

    if (!open) {
      document.documentElement.style.overflow = "";
      const target = returnFocusRef.current;
      returnFocusRef.current = null;
      if (target && target.isConnected) target.focus();
    }
  }, [open]);

  useEffect(() => {
    const dialog = dialogRef.current;
    return () => {
      document.documentElement.style.overflow = "";
      if (dialog?.open) dialog.close();
    };
  }, []);

  function handleCancel(event: SyntheticEvent<HTMLDialogElement>) {
    // Escape: keep the parent in control of `open`.
    event.preventDefault();
    onClose();
  }

  function handleClose() {
    // Closed by the browser (e.g. form method="dialog"): sync the parent.
    if (open) onClose();
  }

  function handleClick(event: MouseEvent<HTMLDialogElement>) {
    // The panel fills the dialog box, so a click whose target is the dialog itself hit the backdrop.
    if (event.target === dialogRef.current) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      onCancel={handleCancel}
      onClose={handleClose}
      onClick={handleClick}
    >
      <div className={styles.panel}>
        <header className={styles.header}>
          <h2 id={titleId} className={styles.title}>
            {title}
          </h2>
          <Button
            ref={closeRef}
            variant="quiet"
            size="sm"
            icon={<X size={18} weight="regular" />}
            onClick={onClose}
          >
            {closeLabel}
          </Button>
        </header>
        <div className={styles.body}>{children}</div>
      </div>
    </dialog>
  );
}
