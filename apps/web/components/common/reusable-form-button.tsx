"use client";

import * as React from "react";
import { useActionState, useEffect, useRef } from "react";
import Form from "next/form";
import type { FormState } from "@schema";
import {Button as MantineButton, ButtonProps} from "@mantine/core";

type ReusableFormButtonProps = {
    action: (prevState: FormState, formData: FormData) => Promise<FormState>;
    children: React.ReactNode;
    buttonProps: ButtonProps;
    label?: string;
    formKey?: string;
    onSuccess?: (data: unknown) => void;
};

export function ReusableFormButton({
                                       action,
                                       children,
                                       buttonProps = {},
                                       label = "Submit",
                                       formKey,
                                       onSuccess,
                                   }: ReusableFormButtonProps) {
    const [formState, formAction, isPending] = useActionState<FormState, FormData>(
        action,
        {},
    );
    const formRef = useRef<HTMLFormElement>(null);

    useEffect(() => {
        if (!isPending && formState?.success && onSuccess) {
            onSuccess && onSuccess(formState.data);
        }
    }, [isPending, formState?.success, formState?.data, onSuccess]);

    return (
        <Form key={formKey} ref={formRef} action={formAction}>
            {children}
            <MantineButton
                type="submit"
                loading={isPending}
                disabled={isPending}
                aria-busy={isPending}
                {...buttonProps}
            >
                {label}
            </MantineButton>
        </Form>
    );
}
