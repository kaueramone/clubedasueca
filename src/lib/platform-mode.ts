import 'server-only'

/** This build supports test credits only. Real operation requires a separate release. */
export function assertBetaMode() {
    if ((process.env.PLATFORM_MODE || 'beta') !== 'beta') {
        throw new Error('Operações indisponíveis: esta versão suporta apenas créditos de teste.')
    }
}
