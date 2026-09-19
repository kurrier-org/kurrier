"use client"

import type {
    KurrierRelease,
    ReleaseTranslations,
} from "@/lib/releases";
import {useState} from "react";
import {ArrowRight, Bell, Check, Sparkles, X} from "lucide-react";
import Link from "next/link";



export default function WhatsNew({ latestRelease, translations }: {
    latestRelease: KurrierRelease;
    translations: ReleaseTranslations;
}) {
    const [expanded, setExpanded] = useState(true);

    const releaseTranslations = translations.releases[latestRelease.id];

    if (!expanded) {
        return (
            <button
                type="button"
                onClick={() => setExpanded(true)}
                className="group flex w-full items-center justify-between rounded-2xl border bg-card px-5 py-4 text-left transition-colors hover:bg-muted/30"
            >
                <div className="flex min-w-0 items-center gap-3">
                    <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        <Sparkles className="size-4" />
                    </div>

                    <div className="min-w-0">
                        <div className="flex items-center gap-2">
							<span className="text-sm font-semibold text-foreground">
								{translations.common.whatsNew}
							</span>

                            <span className="rounded-full border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
								v{latestRelease.version}
							</span>
                        </div>

                        <p className="mt-0.5 truncate text-xs text-muted-foreground">
                            {translations.common.seeWhatsNew}
                        </p>
                    </div>
                </div>

                <ArrowRight className="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </button>
        );
    }

    return (
        <div className="relative overflow-hidden rounded-2xl border bg-card">
            <div className="pointer-events-none absolute -right-20 -top-24 size-64 rounded-full bg-primary/[0.06] blur-3xl" />

            <div className="relative p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex min-w-0 items-start gap-4">
                        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <Sparkles className="size-5" />
                        </div>

                        <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
								<span className="text-xs font-medium uppercase tracking-wider text-primary">
									{translations.common.whatsNew}
								</span>

                                <span className="rounded-full border bg-muted/40 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
									v{latestRelease.version}
								</span>

                                <span className="text-xs text-muted-foreground">
									{latestRelease.date}
								</span>
                            </div>

                            <h2 className="mt-2 text-lg font-semibold tracking-tight text-foreground">
                                {releaseTranslations.title}
                            </h2>

                            <p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">
                                {releaseTranslations.description}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setExpanded(false)}
                        aria-label={translations.common.dismiss}
                        className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                        <X className="size-4" />
                    </button>
                </div>

                <div className="mt-6 grid gap-3 lg:grid-cols-3">
                    {latestRelease.features.map((feature) => {
                        const featureTranslations =
                            releaseTranslations.features[feature.id];

                        return (
                            <div
                                key={feature.id}
                                className="rounded-xl border bg-muted/20 p-4"
                            >
                                <div className="flex items-start gap-3">
                                    <div className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                        <Check className="size-3.5" />
                                    </div>

                                    <div>
                                        <h3 className="text-sm font-medium text-foreground">
                                            {featureTranslations.title}
                                        </h3>

                                        <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                            {featureTranslations.description}
                                        </p>

                                        {feature.href ? (
                                            <Link
                                                href={feature.href}
                                                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary"
                                            >
                                                Learn more
                                                <ArrowRight className="size-3" />
                                            </Link>
                                        ) : null}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>

                <div className="mt-5 flex items-center gap-2 border-t pt-4 text-xs text-muted-foreground">
                    <Bell className="size-3.5" />
                    <span>
						{translations.common.release} v{latestRelease.version}
					</span>
                </div>
            </div>
        </div>
    );
}
