import type { ErrorCode } from "@contracts/v1";
export class ApiFault extends Error {
  constructor(public status: number, public code: ErrorCode, message: string, public fieldErrors?: Record<string, string[]>) { super(message); }
}
export function demand(value: unknown, status: number, code: ErrorCode, message: string): asserts value {
  if (!value) throw new ApiFault(status, code, message);
}
