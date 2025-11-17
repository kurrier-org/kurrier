import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { FetchDecryptedSecretsResult } from "@/lib/actions/dashboard";

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
