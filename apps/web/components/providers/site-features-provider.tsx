"use client";

import { createContext, useContext } from "react";
import type { SiteFeatures } from "@/lib/site-features";

const SiteFeaturesContext = createContext<SiteFeatures | undefined>(undefined);

export function SiteFeaturesProvider({
	value,
	children,
}: {
	value: SiteFeatures;
	children: React.ReactNode;
}) {
	return (
		<SiteFeaturesContext.Provider value={value}>
			{children}
		</SiteFeaturesContext.Provider>
	);
}

export function useSiteFeatures() {
	const features = useContext(SiteFeaturesContext);
	if (!features) {
		throw new Error(
			"useSiteFeatures must be used within <SiteFeaturesProvider>",
		);
	}
	return features;
}
