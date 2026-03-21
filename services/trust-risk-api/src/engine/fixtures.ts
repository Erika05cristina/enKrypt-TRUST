/**
 * Registro deterministico de contratos demo (Fuji).
 * Rellena direcciones reales tras desplegar, o usa variables de entorno (coma-separadas).
 */

const normalizeAddr = (a: string): string => a.trim().toLowerCase();

const parseEnvList = (key: string): Set<string> => {
  const raw = process.env[key];
  if (!raw?.trim()) return new Set();
  return new Set(
    raw
      .split(',')
      .map((s) => normalizeAddr(s))
      .filter((a) => /^0x[a-f0-9]{40}$/.test(a))
  );
};

/** Contratos considerados benignos / verificados para demo. */
export const getTrustedTargets = (): Set<string> => {
  const fromEnv = parseEnvList('TRUST_FIXTURE_TRUSTED_CONTRACTS');
  if (fromEnv.size > 0) return fromEnv;
  return new Set<string>([
    // Añade aqui direcciones fijas tras deploy, en minusculas:
    // '0x0000000000000000000000000000000000000001',
  ]);
};

/** Contratos etiquetados como maliciosos para demo. */
export const getMaliciousTargets = (): Set<string> => {
  const fromEnv = parseEnvList('TRUST_FIXTURE_MALICIOUS_CONTRACTS');
  if (fromEnv.size > 0) return fromEnv;
  return new Set<string>([]);
};

/** Patrones “raros” / elevada incertidumbre (no necesariamente malos). */
export const getSuspiciousTargets = (): Set<string> => {
  const fromEnv = parseEnvList('TRUST_FIXTURE_SUSPICIOUS_CONTRACTS');
  if (fromEnv.size > 0) return fromEnv;
  return new Set<string>([]);
};

export const isTrustedSpender = (spender: string): boolean => {
  const s = normalizeAddr(spender);
  return getTrustedTargets().has(s);
};
