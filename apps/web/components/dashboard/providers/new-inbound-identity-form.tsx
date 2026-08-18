"use client";

import React from "react";
import { ReusableForm } from "@/components/common/reusable-form";
import { createInboundIdentity } from "@/lib/actions/dashboard";
import slugify from "@sindresorhus/slugify";

function NewInboundIdentityForm({
                                    onCompleted,
                                }: {
    onCompleted?: () => void;
}) {
    const [label, setLabel] = React.useState("");

    const slug = slugify(label);
    const preview = `${slug || "my-inbound"}@inbound.kurrier`;

    const fields = [
        {
            name: "label",
            label: (
                <code className="rounded bg-muted/50 px-2 py-1 text-xs">
                    Identity Label
                </code>
            ),
            required: true,
            wrapperClasses: "col-span-12",
            props: {
                autoComplete: "off",
                required: true,
                placeholder: "e.g. Order Testing",
                onInput: (e: React.FormEvent<HTMLInputElement>) =>
                    setLabel(e.currentTarget.value),
            },
            bottomStartPrefix: (
                <span className="text-xs text-muted-foreground">
					Your label is used to create the inbound address.
				</span>
            ),
        },
        {
            el: (
                <div className="col-span-12 rounded-md border bg-muted/50 p-4">
                    <div className="text-xs text-muted-foreground">
                        Your inbound address will be
                    </div>

                    <code className="mt-1 block text-sm font-medium text-foreground">
                        {preview}
                    </code>

                    <p className="mt-2 text-xs text-muted-foreground">
                        Send raw RFC822/EML messages to this identity using the
                        Kurrier API.
                    </p>
                </div>
            ),
        },
    ];

    return (
        <ReusableForm
            action={createInboundIdentity}
            onSuccess={onCompleted}
            fields={fields}
            submitButtonProps={{
                submitLabel: "Create Identity",
                wrapperClasses: "justify-center mt-6 flex",
                fullWidth: true,
            }}
        />
    );
}

export default NewInboundIdentityForm;
