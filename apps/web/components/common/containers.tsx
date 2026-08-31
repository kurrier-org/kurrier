type ContainerVariant = "wide" | "medium" | "narrow" | "full";

export function Container({
	children,
	variant = "medium",
	className = "",
}: {
	children: React.ReactNode;
	variant?: ContainerVariant;
	className?: string;
}) {
	const base = "mx-auto w-full min-w-0 px-4 sm:px-6 lg:px-8";

	const variants: Record<ContainerVariant, string> = {
		wide: "max-w-7xl",
		medium: "max-w-5xl",
		narrow: "max-w-3xl",
		full: "max-w-none",
	};

	return (
		<div className={`${base} ${variants[variant]} ${className}`}>
			{children}
		</div>
	);
}
