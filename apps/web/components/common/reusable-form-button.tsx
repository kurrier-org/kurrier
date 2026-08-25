"use client";

import * as React from "react";
import { useActionState, useEffect, useMemo, useRef } from "react";
import Form from "next/form";
import type { FormState } from "@schema";
import {
	ActionIcon,
	Button as MantineButton,
	ButtonProps,
	ActionIconProps,
} from "@mantine/core";
import {NotifyProps} from "@/components/common/reusable-form";
import {toast} from "sonner";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import { resolveDictMessage } from "@/lib/resolve-dict-message";

type ReusableFormButtonProps = {
	action: (prevState: FormState, formData: FormData) => Promise<FormState>;
	children: React.ReactNode;
	buttonProps?: ButtonProps & React.ButtonHTMLAttributes<HTMLButtonElement>;
	formWrapperClasses?: string;
	actionIconProps?: ActionIconProps &
		React.ButtonHTMLAttributes<HTMLButtonElement>;
	actionIcon?: boolean;
	label?: string;
	formKey?: string;
	onSuccess?: (data: any) => void;
	notify?: NotifyProps;
};

export function ReusableFormButton({
	action,
	children,
	buttonProps = {},
	actionIconProps = {},
	formWrapperClasses = "",
	actionIcon = false,
	label = "Submit",
	formKey,
	onSuccess,
	notify = { kind: "alert" },
}: ReusableFormButtonProps) {
	const [formState, formAction, isPending] = useActionState<
		FormState,
		FormData
	>(action, {});
	const formRef = useRef<HTMLFormElement>(null);
	const hasSubmittedRef = useRef(false);

	const dict = useOptionalDictionary();

	const resolvedError = useMemo(
		() =>
			formState?.error
				? resolveDictMessage(dict?.actions, formState.error)
				: null,
		[formState, dict],
	);
	const resolvedMessage = useMemo(
		() =>
			formState?.message
				? resolveDictMessage(dict?.actions, formState.message)
				: null,
		[formState, dict],
	);

	useEffect(() => {
		if (!isPending && formState?.success && onSuccess) {
			onSuccess && onSuccess(formState.data);
		}
	}, [isPending, formState?.success, formState?.data, onSuccess]);

	const notifyKind = notify?.kind ?? "alert";

	useEffect(() => {
		if (notifyKind !== "toast") return;
		if (!hasSubmittedRef.current) return;
		if (isPending) return;
		if (!formState) return;

		if (formState.success) {
			const msg = notify?.successMessage ?? resolvedMessage;
			if (msg) toast.success(msg, notify?.toastProps);
			return;
		}

		const err = resolvedError ?? notify?.errorMessage;
		if (err) toast.error(err, notify?.toastProps);
	}, [notifyKind, isPending, formState, notify, formKey, resolvedMessage, resolvedError]);

	return (
		<Form
			key={formKey}
			ref={formRef}
			action={(fd) => {
				hasSubmittedRef.current = true;
				return formAction(fd);
			}}
			className={formWrapperClasses}
		>
			{children}
			{actionIcon ? (
				<ActionIcon
					{...actionIconProps}
					type="submit"
					loading={isPending}
					disabled={isPending}
					aria-busy={isPending}
				></ActionIcon>
			) : (
				<MantineButton
					type="submit"
					loading={isPending}
					disabled={isPending}
					aria-busy={isPending}
					{...buttonProps}
				>
					{label}
				</MantineButton>
			)}
		</Form>
	);
}
