export interface AgeGate {
  issueAcceptanceProof(now?: Date): string;
  isAccepted(proof: string | undefined, now?: Date): boolean;
}

export const AGE_GATE_COOKIE = "serein_age_gate";

export function readCookie(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined;
  for (const part of cookieHeader.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0 || part.slice(0, separator).trim() !== name) continue;
    try {
      return decodeURIComponent(part.slice(separator + 1).trim());
    } catch {
      return undefined;
    }
  }
  return undefined;
}
