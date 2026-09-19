export type ReleaseFeature = {
    id: string;
    href?: string;
};

export type KurrierRelease = {
    id: string;
    version: string;
    date: string;
    features: ReleaseFeature[];
};

export type ReleaseFeatureTranslation = {
    title: string;
    description: string;
};

export type ReleaseTranslation = {
    title: string;
    description: string;
    features: Record<string, ReleaseFeatureTranslation>;
};

export type ReleaseTranslations = {
    common: {
        whatsNew: string;
        release: string;
        seeWhatsNew: string;
        dismiss: string;
    };
    releases: Record<string, ReleaseTranslation>;
};

export const releases: KurrierRelease[] = [
    {
        id: "v4_1_0",
        version: "4.1.0",
        date: "2026-09-19",
        features: [
            {
                id: "mailReliability",
            },
            {
                id: "composer",
            },
            {
                id: "responsiveUi",
            },
        ],
    },
];

export const latestRelease = releases[0];
