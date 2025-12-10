import React from "react";
import NextImage from "next/image";

const AVATAR_COLORS = [
	"bg-red-500",
	"bg-orange-500",
	"bg-amber-500",
	"bg-green-500",
	"bg-emerald-500",
	"bg-sky-500",
	"bg-blue-500",
	"bg-indigo-500",
	"bg-purple-500",
	"bg-pink-500",
];

export default function ContactListAvatar({
	signedUrl,
	alt,
	size = 32,
}: {
	signedUrl: string | null;
	alt: string;
	size?: number;
}) {
	const getColorFromString = (str: string) => {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			hash = str.charCodeAt(i) + ((hash << 5) - hash);
		}
		return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
	};

	const bgColorClass = getColorFromString(alt);

	return signedUrl ? (
		<NextImage
			src={signedUrl}
			alt={alt}
			unoptimized
			width={size}
			height={size}
			className="rounded-full object-cover object-top-left"
			style={{
				width: size,
				height: size,
			}}
		/>
	) : (
		<div
			className={`flex items-center justify-center rounded-full text-white font-medium ${bgColorClass}`}
			style={{
				width: size,
				height: size,
				fontSize: Math.max(11, size * 0.4),
			}}
		>
			{alt?.[0]?.toUpperCase() ?? "?"}
		</div>
	);
}
