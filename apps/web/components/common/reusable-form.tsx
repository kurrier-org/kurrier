"use client";

import * as React from "react";
import {
	ComponentProps,
	useActionState,
	useEffect,
	useMemo,
	useRef,
} from "react";
import Form from "next/form";
import type { BaseFormProps, FormState } from "@schema";
import { Button as MantineButton, Alert } from "@mantine/core";
import { IconLoader2 } from "@tabler/icons-react";
import { ReusableFormItems } from "@/components/common/reusable-form-items";
import {toast} from "sonner";

export type ReusableFormProps = BaseFormProps & {
	submitButtonProps?: SubmitButtonProps;
	notify?: NotifyProps;
};

type SubmitButtonProps = {
	submitLabel?: string;
	wrapperClasses?: string;
	className?: string;
	fullWidth?: boolean;
	buttonProps?: ComponentProps<typeof MantineButton>;
};

export type NotifyProps = {
	kind?: "toast" | "alert";
	successMessage?: string;
	errorMessage?: string;
	toastProps?: Parameters<typeof toast>[1];
};

export function ReusableForm({
	fields,
	action,
	onChange,
	onSuccess,
	notify = { kind: "alert" },
	submitButtonProps = {
		submitLabel: "Submit",
		wrapperClasses: "mt-8",
		fullWidth: true,
	},
	formWrapperClasses = "grid grid-cols-12 gap-4",
	errorClasses = "text-red-500",
	formKey,
}: ReusableFormProps) {
	const [formState, formAction, isPending] = useActionState<
		FormState,
		FormData
	>(action, {});
	const formRef = useRef<HTMLFormElement>(null);
	const hasSubmittedRef = useRef(false);

	const errors = useMemo(() => formState?.errors || {}, [formState]);
	const error = useMemo(() => formState?.error || null, [formState]);
	const message = useMemo(() => formState?.message || null, [formState]);

	useEffect(() => {
		if (!isPending && formState?.success && onSuccess) {
			onSuccess(formState.data);
		}
	}, [isPending, formState?.success, onSuccess, formState?.data]);

	const SubmitButton = (
		<MantineButton
			type="submit"
			loading={isPending}
			leftSection={
				isPending ? (
					<IconLoader2 size={16} className="animate-spin" />
				) : undefined
			}
			fullWidth={!!submitButtonProps?.fullWidth}
			className={submitButtonProps?.className}
			{...(submitButtonProps?.buttonProps || {})}
		>
			<div className="flex items-center justify-center gap-2.5">
				{submitButtonProps?.submitLabel ?? "Submit"}
			</div>
		</MantineButton>
	);

	const notifyKind = notify?.kind ?? "alert";

	useEffect(() => {
		if (notifyKind !== "toast") return;
		if (!hasSubmittedRef.current) return;
		if (isPending) return;
		if (!formState) return;

		if (formState.success) {
			const msg = notify?.successMessage ?? formState.message;
			if (msg) toast.success(msg, notify?.toastProps);
			return;
		}

		// const err = notify?.errorMessage ?? formState.error;
		const err = formState.error ?? notify?.errorMessage;
		if (err) toast.error(err, notify?.toastProps);
	}, [notifyKind, isPending, formState, notify, formKey]);

	return (
		<Form
			key={formKey}
			ref={formRef}
			// action={formAction}
			action={(fd) => {
				hasSubmittedRef.current = true;
				return formAction(fd);
			}}
			onChange={onChange ?? undefined}
		>
			<ReusableFormItems
				fields={fields}
				errors={errors}
				formWrapperClasses={formWrapperClasses}
				errorClasses={errorClasses}
			/>

			{notifyKind === "alert" && error && (
				<Alert color="red" variant="light" className="mt-3 -mb-4">
					<span className={`${errorClasses} text-sm`}>Error: {error}</span>
				</Alert>
			)}

			{notifyKind === "alert" && message && (
				<Alert
					color="green"
					variant="light"
					className="mt-3 -mb-4 text-green-700 text-center"
				>
					<span className="text-sm">{message}</span>
				</Alert>
			)}

			{submitButtonProps.wrapperClasses ? (
				<div className={submitButtonProps.wrapperClasses}>{SubmitButton}</div>
			) : (
				SubmitButton
			)}
		</Form>
	);
}
