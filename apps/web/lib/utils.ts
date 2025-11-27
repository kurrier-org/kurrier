import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { FetchDecryptedSecretsResult } from "@/lib/actions/dashboard";
import imageCompression from "browser-image-compression";

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

export function formDataToJson(formData: FormData) {
	const data = {} as any;
	formData.forEach((value, key) => {
		if (data[key]) {
			data[key] = Array.isArray(data[key])
				? [...data[key], value]
				: [data[key], value];
		} else {
			data[key] = value;
		}
	});
	return data;
}

export function parseSecret(
	obj?: FetchDecryptedSecretsResult[number] | null,
): Record<string, any> {
	return obj?.vault?.decrypted_secret
		? JSON.parse(obj.vault.decrypted_secret)
		: {};
}

export const toArray = (v: string | string[] | undefined | null) =>
	(Array.isArray(v) ? v : String(v ?? "").split(","))
		.map((s) => s.trim())
		.filter(Boolean);

type ThumbReturn = "dataUrl" | "file" | "arrayBuffer";
export async function createThumbnail(
	file: File,
	format: ThumbReturn = "dataUrl",
	maxWidthOrHeight = 1920,
	maxSizeMB = 0.025,
): Promise<string | File | ArrayBuffer> {
	const compressed = await imageCompression(file, {
		maxWidthOrHeight,
		maxSizeMB,
		initialQuality: 1,
		useWebWorker: true,
	});

	if (format === "file") return compressed;

	if (format === "arrayBuffer") {
		return compressed.arrayBuffer();
	}

	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = reject;
		reader.readAsDataURL(compressed);
	});
}

// export function setCssVar(name: string, value: string) {
//     document.documentElement.style.setProperty(name, value);
// }
//
// export function getCssVar(name: string) {
//     return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
// }
//

export function setSidebarWidth(width: string) {
    if (typeof document === "undefined") return;

    const el = document.querySelector<HTMLElement>(
        '[data-slot="sidebar-wrapper"]',
    );
    if (!el) return;

    el.style.setProperty("--sidebar-width", width);
}
