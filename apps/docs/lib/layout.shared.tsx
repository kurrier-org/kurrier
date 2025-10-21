import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import KurrierLogo from "@/components/kurrier/kurrier-logo";

/**
 * Shared layout configurations
 *
 * you can customise layouts individually from:
 * Home Layout: app/(home)/layout.tsx
 * Docs Layout: app/docs/layout.tsx
 */
export function baseOptions(): BaseLayoutProps {
	return {
		githubUrl: "https://github.com/kurrier-org/kurrier",
		nav: {
			title: (
				<>
					<KurrierLogo size={42} />
					<span className={"text-blue-500 text-2xl"}>kurrier</span>
				</>
			),
		},
		// see https://fumadocs.dev/docs/ui/navigation/links
		links: [],
	};
}
