"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { ApiError, ReferenceData, User } from "@contracts/v1";
import type { PersonaView } from "@/components/view-models";
import { DEFAULT_PERSONA_ID, RECOMMENDED_PERSONA_IDS } from "@/lib/client/config";
import { isApiError } from "@/lib/client/dataSource";
import { personaView, type MapContext } from "@/lib/client/mappers";
import { useDataSource } from "./DataSourceProvider";

interface PersonaContextValue {
  personaId: string;
  /** Active persona's user record; null while loading or when the list failed. */
  persona: User | null;
  personas: PersonaView[];
  personasError: ApiError | null;
  referenceData: ReferenceData | null;
  referenceError: ApiError | null;
  ctx: MapContext;
  /** Increments on persona switch and on mock reset; keyed views remount (cached results cleared). */
  epoch: number;
  setPersona: (id: string) => void;
  /** Mock only: restore the fixture and reload views. */
  resetMock: (() => Promise<void>) | null;
}

const PersonaContext = createContext<PersonaContextValue | null>(null);
const STORAGE_KEY = "caliber-demo-persona";

function readStoredPersona(): string | null {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function storePersona(id: string) {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* storage unavailable: persona simply is not remembered */
  }
}

export function PersonaProvider({ children }: { children: ReactNode }) {
  const { source } = useDataSource();
  const [personaId, setPersonaId] = useState<string>(DEFAULT_PERSONA_ID);
  const [users, setUsers] = useState<User[] | null>(null);
  const [personasError, setPersonasError] = useState<ApiError | null>(null);
  const [referenceData, setReferenceData] = useState<ReferenceData | null>(null);
  const [referenceError, setReferenceError] = useState<ApiError | null>(null);
  const [epoch, setEpoch] = useState(0);

  useEffect(() => {
    const stored = readStoredPersona();
    if (stored && (RECOMMENDED_PERSONA_IDS as readonly string[]).includes(stored) && stored !== DEFAULT_PERSONA_ID) {
      setPersonaId(stored);
      setEpoch((e) => e + 1);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    source.listPersonas().then((res) => {
      if (cancelled) return;
      if (isApiError(res)) {
        setPersonasError(res);
        setUsers(null);
      } else {
        setPersonasError(null);
        setUsers(res.data);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [source]);

  useEffect(() => {
    let cancelled = false;
    setReferenceData(null);
    source.getReferenceData(personaId).then((res) => {
      if (cancelled) return;
      if (isApiError(res)) {
        setReferenceError(res);
      } else {
        setReferenceError(null);
        setReferenceData(res.data);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [source, personaId, epoch]);

  const setPersona = useCallback((id: string) => {
    setPersonaId(id);
    storePersona(id);
    setEpoch((e) => e + 1);
  }, []);

  const resetMock = useMemo(() => {
    if (!source.reset) return null;
    const reset = source.reset;
    return async () => {
      await reset();
      setEpoch((e) => e + 1);
    };
  }, [source]);

  const value = useMemo<PersonaContextValue>(() => {
    const divisions = referenceData?.divisions ?? [];
    const ctx: MapContext = { divisions };
    const byId = new Map((users ?? []).map((u) => [u.id, u]));
    const personas: PersonaView[] = RECOMMENDED_PERSONA_IDS.map((id) => {
      const u = byId.get(id);
      return u
        ? personaView(ctx, u)
        : { id, name: id, jobTitle: users ? "Unknown persona" : "Persona list unavailable", accessLabel: "Unknown", division: null };
    });
    return {
      personaId,
      persona: byId.get(personaId) ?? null,
      personas,
      personasError,
      referenceData,
      referenceError,
      ctx,
      epoch,
      setPersona,
      resetMock,
    };
  }, [personaId, users, personasError, referenceData, referenceError, epoch, setPersona, resetMock]);

  return <PersonaContext.Provider value={value}>{children}</PersonaContext.Provider>;
}

export function usePersona(): PersonaContextValue {
  const value = useContext(PersonaContext);
  if (!value) throw new Error("usePersona must be used inside PersonaProvider");
  return value;
}
