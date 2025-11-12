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
import type {
	BaseFormProps,
	FormState,
	SelectGroupOption,
	SelectOption,
} from "@schema";
import { Button as MantineButton, Alert } from "@mantine/core";
import {
	TextInput,
	Textarea as MantineTextarea,
	Select as MantineSelect,
} from "@mantine/core";
import { IconLoader2 } from "@tabler/icons-react";

export type ReusableFormProps = BaseFormProps & {
	submitButtonProps?: SubmitButtonProps;
};

type SubmitButtonProps = {
	submitLabel?: string;
	inlineSubmit?: boolean; // if true, renders inside grid
	wrapperClasses?: string;
	className?: string;
	fullWidth?: boolean;
	// extra props to pass through to Mantine <Button>
	buttonProps?: ComponentProps<typeof MantineButton>;
};

/** Mantine Select that also submits to server actions via a hidden input */
function SelectField({
	name,
	placeholder,
	options = [],
	defaultValue,
	disabled,
	className,
	onChange,
}: {
	name: string;
	placeholder?: string;
	options?: SelectOption[] | SelectGroupOption[];
	defaultValue?: string;
	disabled?: boolean;
	className?: string;
	onChange?: (value: string) => void;
}) {
	const [val, setVal] = React.useState<string>(defaultValue ?? "");
	return (
		<>
			{/* hidden input ensures it’s included in FormData on submit */}
			<input type="hidden" name={name} value={val} />
			<MantineSelect
				className={className}
				placeholder={placeholder}
				// data={options.map((o) => ({ value: o.value, label: o.label }))}
				data={options}
				value={val || null}
				onChange={(v) => {
					setVal(v ?? "");
					onChange && onChange(v ?? "");
				}}
				disabled={disabled}
				searchable={false}
				allowDeselect={false}
				withCheckIcon={false}
				checkIconPosition="right"
			/>
		</>
	);
}

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
			<div className={formWrapperClasses}>
				{fields.map((f, idx) => {
					const {
						kind = "input",
						name,
						label,
						labelSuffix,
						props = {},
						options = [],
						wrapperClasses = "col-span-12",
						el,
						prefix,
						bottomStartPrefix,
						component: FieldComponent,
						bottomEndSuffix,
					} = f;

					return (
						<div key={idx} className={wrapperClasses}>
							{el ? (
								el
							) : (props as any)?.type === "hidden" ? (
								// native hidden input
								<input name={name!} {...(props as any)} />
							) : (
								<>
									{label && (
										<label
											htmlFor={name}
											className="flex justify-between font-medium text-sm"
										>
											<div className="flex items-baseline gap-1">
												{label}{" "}
												{(props as any)?.required && (
													<span className="text-red-500">*</span>
												)}
											</div>
											{labelSuffix}
										</label>
									)}

									{label && <div className="mt-2" />}

									{kind === "select" ? (
										<SelectField
											name={name!}
											placeholder={(props as any)?.placeholder}
											options={options}
											defaultValue={(props as any)?.defaultValue}
											disabled={(props as any)?.disabled}
											className={(props as any)?.className}
											onChange={(props as any)?.onChange}
										/>
									) : kind === "textarea" ? (
										<MantineTextarea name={name!} {...(props as any)} />
									) : kind === "input" ? (
										<>
											{prefix ? (
												<div className="flex items-center gap-2">
													{prefix}
													<TextInput name={name!} {...(props as any)} />
												</div>
											) : (
												<>
													<TextInput name={name!} {...(props as any)} />
													{bottomStartPrefix && (
														<div className="mt-2 flex justify-start">
															{bottomStartPrefix}
														</div>
													)}
													{bottomEndSuffix && (
														<div className="mt-2 flex justify-end">
															{bottomEndSuffix}
														</div>
													)}
												</>
											)}
										</>
									) : kind === "custom" ? (
										<>
											{prefix ? (
												<div className="flex items-center gap-2">
													{prefix}
													{FieldComponent ? (
														<FieldComponent name={name!} {...(props as any)} />
													) : null}
												</div>
											) : (
												<>
													{FieldComponent ? (
														<FieldComponent name={name!} {...(props as any)} />
													) : null}
													{bottomStartPrefix && (
														<div className="mt-2 flex justify-start">
															{bottomStartPrefix}
														</div>
													)}
													{bottomEndSuffix && (
														<div className="mt-2 flex justify-end">
															{bottomEndSuffix}
														</div>
													)}
												</>
											)}
										</>
									) : null}

									{name && errors?.[name] && (
										<span className={`${errorClasses} mt-1 block text-sm`}>
											{errors[name][0]}
										</span>
									)}
								</>
							)}
						</div>
					);
				})}

				{submitButtonProps?.inlineSubmit && (
					<div className="col-span-12 flex items-center">
						{submitButtonProps.wrapperClasses ? (
							<div className={submitButtonProps.wrapperClasses}>
								{SubmitButton}
							</div>
						) : (
							SubmitButton
						)}
					</div>
				)}
			</div>

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

			{!submitButtonProps?.inlineSubmit && (
				<>
					{submitButtonProps?.wrapperClasses ? (
						<div className={submitButtonProps.wrapperClasses}>
							{SubmitButton}
						</div>
					) : (
						SubmitButton
					)}
				</>
			)}
		</Form>
	);
}
