import { DepositPageClient } from './deposit-client'
import { createClient } from '@/lib/supabase/server'

export default async function DepositPage() {
    const client = await createClient()
    const { data, error } = await client.rpc('identity_credit_status')
    return <DepositPageClient identityError={error ? 'Não foi possível conferir o documento. Atualize a página para tentar novamente.' : data} />
}
