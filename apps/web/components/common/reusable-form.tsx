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

export type ReusableFormProps = BaseFormProps & {
	submitButtonProps?: SubmitButtonProps;
};

type SubmitButtonProps = {
	submitLabel?: string;
	wrapperClasses?: string;
	className?: string;
	fullWidth?: boolean;
	buttonProps?: ComponentProps<typeof MantineButton>;
};

export function ReusableForm({
	fields,
	action,
	onChange,
	onSuccess,
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

	return (
		<Form
			key={formKey}
			ref={formRef}
			action={formAction}
			onChange={onChange ?? undefined}
		>
			<ReusableFormItems
				fields={fields}
				errors={errors}
				formWrapperClasses={formWrapperClasses}
				errorClasses={errorClasses}
			/>

			{error && (
				<Alert color="red" variant="light" className="mt-3 -mb-4">
					<span className={`${errorClasses} text-sm`}>Error: {error}</span>
				</Alert>
			)}

			{message && (
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
