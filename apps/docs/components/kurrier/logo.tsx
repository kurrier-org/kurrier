// components/KurrierEnvelopeIcon.tsx
import * as React from "react";

export default function KurrierEnvelopeIconS({
	className,
	...props
}: React.SVGProps<SVGSVGElement>) {
	return (
		<svg
			xmlns="http://www.w3.org/2000/svg"
			viewBox="0 0 32 32"
			fill="none"
			className={className}
			{...props}
		>
			<g fill="none">
				{/* Main envelope body */}
				<path
					className="fill-current"
					d="M6.5 8.5H25a4.5 4.5 0 0 1 4.5 4.5v7a7.5 7.5 0 0 1-7.5 7.5H11A4.5 4.5 0 0 1 6.5 23z"
				/>
				<path
					className="fill-current"
					d="M3 19.5V9.524l11.005 6.272a1 1 0 0 0 .992-.001L26 9.5v10a4.5 4.5 0 0 1-4.5 4.5h-14A4.5 4.5 0 0 1 3 19.5z"
				/>
				<path
					className="fill-current"
					d="M7.5 5A4.5 4.5 0 0 0 3 9.5v.101l11 6.269a1 1 0 0 0 .992 0l11.003-6.296L26 9.5q-.002-.595-.147-1.147A4.5 4.5 0 0 0 21.5 5z"
				/>

				{/* Optional gradients (kept if you want to reuse later) */}
				<defs>
					<linearGradient
						id="fluentColorMailMultiple320"
						x1="17.42"
						x2="23.579"
						y1="12.342"
						y2="23.957"
						gradientUnits="userSpaceOnUse"
					>
						<stop offset=".228" stopColor="currentColor" stopOpacity="0" />
						<stop offset=".431" stopColor="currentColor" />
					</linearGradient>

					<linearGradient
						id="fluentColorMailMultiple321"
						x1="11.214"
						x2="4.387"
						y1="11.026"
						y2="24.674"
						gradientUnits="userSpaceOnUse"
					>
						<stop offset=".228" stopColor="currentColor" stopOpacity="0" />
						<stop offset=".431" stopColor="currentColor" />
					</linearGradient>
				</defs>
			</g>
		</svg>
	);
}
