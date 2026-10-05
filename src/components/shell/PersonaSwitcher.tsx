"use client";

import { useId } from "react";
import type { PersonaView } from "@/components/view-models";
import { SelectControl } from "@/components/ui/SelectControl";
import styles from "./PersonaSwitcher.module.css";

export interface PersonaSwitcherProps {
  personas: PersonaView[];
  activePersonaId: string;
  onChange: (id: string) => void;
  className?: string;
}

function optionText(persona: PersonaView): string {
  return persona.jobTitle;
}

/**
 * Demo persona selector. Always visibly marked as a demo; it is not a login
 * and grants nothing on its own (authorisation is enforced by the backend).
 */
export function PersonaSwitcher({ personas, activePersonaId, onChange, className }: PersonaSwitcherProps) {
  const id = useId();
  const active = personas.find((p) => p.id === activePersonaId);

  return (
    <div className={[styles.switcher, className].filter(Boolean).join(" ")}>
      <div className={styles.labelRow}>
        <label htmlFor={id} className={styles.label}>
          Role
        </label>
      </div>
      <SelectControl
        id={id}
        value={activePersonaId}
        options={[
          ...(active ? [] : [{ value: activePersonaId, label: "Choose a role", disabled: true }]),
          ...personas.map(persona => ({ value: persona.id, label: optionText(persona) })),
        ]}
        onChange={onChange}
      />
      {active && <p className={styles.roleDetail}><span>{active.accessLabel}</span></p>}
    </div>
  );
}
