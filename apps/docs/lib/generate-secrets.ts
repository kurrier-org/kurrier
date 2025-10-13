"use server";
import { KJUR } from 'jsrsasign'

const JWT_HEADER = { alg: 'HS256', typ: 'JWT' }
const now = new Date()
const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
const fiveYears = new Date(now.getFullYear() + 5, now.getMonth(), now.getDate())

const anonToken = {
    role: 'anon',
    iss: 'supabase',
    iat: Math.floor(today.valueOf() / 1000),
    exp: Math.floor(fiveYears.valueOf() / 1000),
}
const serviceToken = {
    role: 'service_role',
    iss: 'supabase',
    iat: Math.floor(today.valueOf() / 1000),
    exp: Math.floor(fiveYears.valueOf() / 1000),
}


const generateRandomString = (length: number) => {
    const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''

    const MAX = Math.floor(256 / CHARS.length) * CHARS.length - 1

    const randomUInt8Array = new Uint8Array(1)

    for (let i = 0; i < length; i++) {
        let randomNumber: number
        do {
            crypto.getRandomValues(randomUInt8Array)
            randomNumber = randomUInt8Array[0]
        } while (randomNumber > MAX)

        result += CHARS[randomNumber % CHARS.length]
    }

    return result
}



export async function generateSecrets() {

    const JWT_SECRET = generateRandomString(40);
    const ANON_KEY = KJUR.jws.JWS.sign(null, JWT_HEADER, anonToken, JWT_SECRET)
    const SERVICE_ROLE_KEY = KJUR.jws.JWS.sign(null, JWT_HEADER, serviceToken, JWT_SECRET)

    const REDIS_PASSWORD = generateRandomString(24);
    const RLS_CLIENT_PASSWORD = generateRandomString(24);
    const TYPESENSE_API_KEY = generateRandomString(32);
    const POSTGRES_PASSWORD = generateRandomString(24);
    const DASHBOARD_PASSWORD = generateRandomString(16);
    const SECRET_KEY_BASE = generateRandomString(64);
    const VAULT_ENC_KEY = generateRandomString(32);
    const PG_META_CRYPTO_KEY = generateRandomString(32);

    const envText = `
REDIS_PASSWORD=${REDIS_PASSWORD}
RLS_CLIENT_PASSWORD=${RLS_CLIENT_PASSWORD}
TYPESENSE_API_KEY=${TYPESENSE_API_KEY}
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
JWT_SECRET=${JWT_SECRET}
ANON_KEY=${ANON_KEY}
SERVICE_ROLE_KEY=${SERVICE_ROLE_KEY}
DASHBOARD_PASSWORD=${DASHBOARD_PASSWORD}
SECRET_KEY_BASE=${SECRET_KEY_BASE}
VAULT_ENC_KEY=${VAULT_ENC_KEY}
PG_META_CRYPTO_KEY=${PG_META_CRYPTO_KEY}
    `.trim();


    return envText;
}
