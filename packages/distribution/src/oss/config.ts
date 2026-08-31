export const DISTRIBUTION_CONFIG = {
    locales: ["en", "pt-BR", "ko", "pl", "ru"],
    defaultLocale: "en",
    features: {
        drive: process.env.DISABLE_DRIVE !== "true",
        localLogin: process.env.DISABLE_LOCAL_LOGIN !== "true",
    },
} as const;
