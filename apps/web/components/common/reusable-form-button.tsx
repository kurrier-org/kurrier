"use client";

import * as React from "react";
import { useActionState, useEffect, useRef } from "react";
import Form from "next/form";
import type { FormState } from "@schema";
import {
	ActionIcon,
	Button as MantineButton,
	ButtonProps,
	ActionIconProps,
} from "@mantine/core";

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
}: ReusableFormButtonProps) {
	const [formState, formAction, isPending] = useActionState<
		FormState,
		FormData
	>(action, {});
	const formRef = useRef<HTMLFormElement>(null);

	useEffect(() => {
		if (!isPending && formState?.success && onSuccess) {
			onSuccess && onSuccess(formState.data);
		}
	}, [isPending, formState?.success, formState?.data, onSuccess]);

	return (
		<Form
			key={formKey}
			ref={formRef}
			action={formAction}
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
