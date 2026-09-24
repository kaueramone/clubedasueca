import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // Supabase schema types have not yet been generated for this legacy codebase.
  // Keep explicit any visible while runtime/correctness rules remain blocking.
  { rules: { '@typescript-eslint/no-explicit-any': 'warn' } },
  globalIgnores(['.next/**', 'out/**', 'build/**', 'next-env.d.ts', 'auditoria/**', 'graphify-out/**', '_to_delete/**']),
]);
