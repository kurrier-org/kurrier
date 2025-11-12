import { ReactNode } from "react";

export type SelectOption = { label: string; value: string };
export type SelectGroupOption = { group: string; items: SelectOption[] };

export type FieldKind = "input" | "textarea" | "select" | "custom";

export type FieldConfig = {
	kind?: FieldKind;
	name?: string;
	label?: ReactNode;
	labelSuffix?: ReactNode;
	wrapperClasses?: string;
	props?: any;
	component?: React.ComponentType<any>;
	options?: SelectOption[] | SelectGroupOption[];
	el?: ReactNode;
	prefix?: ReactNode;
	bottomStartPrefix?: ReactNode;
	bottomEndSuffix?: ReactNode;
};

export type BaseFormProps = {
	fields: FieldConfig[];
	action: any;
	onChange?: React.FormEventHandler<HTMLFormElement>;
	onSuccess?: (data: FormData | any) => void;
	formWrapperClasses?: string;
	errorClasses?: string;
	formKey?: string;
};

export type FormState<TData = unknown> = {
	success?: boolean;
	data?: TData;
	error?: string;
	errors?: Record<string, string[]>;
	message?: string;
};

function toMessage(e: unknown): string {
	if (e instanceof Error) return e.message || "Unknown error";
	if (typeof e === "string") return e;
	try {
		return JSON.stringify(e);
	} catch {
		return "Unknown error";
	}
}

export async function handleAction<T extends FormState<any>>(
	fn: () => Promise<T>,
): Promise<T> {
	try {
		return await fn();
	} catch (e) {
		return {
			success: false,
			error: toMessage(e),
		} as T;
	}
}
