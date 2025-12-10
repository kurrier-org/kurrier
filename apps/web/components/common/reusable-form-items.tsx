"use client";

import * as React from "react";
import { FieldConfig, SelectGroupOption, SelectOption } from "@schema";
import {
	TextInput,
	Textarea as MantineTextarea,
	Select as MantineSelect,
} from "@mantine/core";

export function SelectField({
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
			<input type="hidden" name={name} value={val} />
			<MantineSelect
				className={className}
				placeholder={placeholder}
				data={options}
				value={val || null}
				onChange={(v) => {
					setVal(v ?? "");
					onChange && onChange(v ?? "");
				}}
				disabled={disabled}
				searchable
				allowDeselect={false}
				withCheckIcon={false}
				checkIconPosition="right"
			/>
		</>
	);
}

export type ReusableFormItemsProps = {
	fields: FieldConfig[];
	formWrapperClasses?: string;
	errorClasses?: string;
	errors?: Record<string, string[]>;
};

export function ReusableFormItems({
	fields,
	formWrapperClasses = "grid grid-cols-12 gap-4",
	errorClasses = "text-red-500",
	errors = {},
}: ReusableFormItemsProps) {
	return (
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
							<input name={name!} {...(props as any)} />
						) : (
							<>
								{label && (
									<label
										htmlFor={name}
										className="flex justify-between font-medium text-sm"
									>
										<div className="flex items-baseline gap-1">
											{label}
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
												{FieldComponent && (
													<FieldComponent name={name!} {...(props as any)} />
												)}
											</div>
										) : (
											<>
												{FieldComponent && (
													<FieldComponent name={name!} {...(props as any)} />
												)}
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
		</div>
	);
}
