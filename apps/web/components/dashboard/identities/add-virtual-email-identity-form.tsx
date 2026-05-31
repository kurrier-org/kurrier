import {
    addNewEmailIdentity,
    FetchDecryptedSecretsResult,
    FetchUserIdentitiesResult,
} from "@/lib/actions/dashboard";
import { ReusableForm } from "@/components/common/reusable-form";
import React, {useEffect} from "react";
import { parseSecret } from "@/lib/utils";
import { imapQuotaList } from "@schema";
import {Checkbox, MultiSelect, Select} from "@mantine/core";
import {FetchWorkspaceMembersResult} from "@/lib/actions/workspace";

function AddVirtualEmailIdentityForm({
                                  onCompleted,
                                  providerOptions,
                                  smtpAccounts,
                                  providerAccounts,
                                  workspaceMembers,
                                  userDomainIdentities,
                                  userEmailIdentities
                              }: {
    onCompleted?: () => void;
    providerOptions: { label: string; value: string }[];
    smtpAccounts: FetchDecryptedSecretsResult;
    providerAccounts: FetchDecryptedSecretsResult;
    workspaceMembers: FetchWorkspaceMembersResult;
    userDomainIdentities: FetchUserIdentitiesResult;
    userEmailIdentities: FetchUserIdentitiesResult;
}) {
    const [provider, setProvider] = React.useState<
        FetchDecryptedSecretsResult[number] | null
    >(null);
    const [smtpAccount, setSmtpAccount] = React.useState<
        FetchDecryptedSecretsResult[number] | null
    >(null);
    const [activeId, setActiveId] = React.useState<string | null>(null);

    const [rawProvider, setRawProvider] = React.useState<string | null>(null);

    const [localPart, setLocalPart] = React.useState("");
    const [subdomain, setSubdomain] = React.useState("");
    const [domainId, setDomainId] = React.useState<string | null>(null);

    const chosenDomain = userDomainIdentities.find(
        (d) => String(d.identities.id) === domainId,
    );

    const composedEmail = React.useMemo(() => {
        if (!localPart || !chosenDomain) return "";
        const domain = chosenDomain.identities.value;
        return `${localPart}@${domain}`;
    }, [localPart, chosenDomain]);

    const mustBeShared = userEmailIdentities.length === 0;
    const [sharedWithWorkspace, setSharedWithWorkspace] = React.useState<boolean>(mustBeShared);
    useEffect(() => {
        setSharedWithWorkspace(mustBeShared)
    }, [mustBeShared]);

    function getSmtpFields() {
        const parsedVaultValues = parseSecret(smtpAccount);
        return [
            {
                name: "value",
                label: "Email address",
                required: true,
                wrapperClasses: "col-span-12",
                props: {
                    autoComplete: "off",
                    required: true,
                    readOnly: true,
                    defaultValue: parsedVaultValues.SMTP_USERNAME || "",
                },
            },
            {
                name: "displayName",
                label: "Display Name",
                required: true,
                wrapperClasses: "col-span-12",
                bottomStartPrefix: (
                    <span className={"text-xs"}>
						This name will appear as the organizer when you create calendar
						events or send invitations.
					</span>
                ),
                props: {
                    autoComplete: "off",
                    required: true,
                },
            },
            {
                name: "dailyQuota",
                label: "Daily IMAP quota (Used for backfilling older mails)",
                labelSuffix: "(Default: 500 MB per day)",
                kind: "select" as const,
                defaultValue: "500",
                options: imapQuotaList.map((quota) => {
                    return {
                        label: quota.label,
                        value: String(quota.value),
                    };
                }),
                wrapperClasses: "col-span-12",
                props: {
                    className: "w-full",
                },
            },
            {
                name: "smtpAccountId",
                wrapperClasses: "hidden",
                props: { hidden: true, defaultValue: smtpAccount?.linkRow.accountId },
            },
            {
                name: "kind",
                wrapperClasses: "hidden",
                props: { hidden: true, defaultValue: "email" },
            },
        ];
    }

    function getNonSmtpFields() {
        return [
            {
                name: "domain",
                label: "Choose a verified domain",
                kind: "select" as const,
                options: userDomainIdentities
                    ?.filter((userDomainIdentity) => {
                        return (
                            userDomainIdentity?.providers?.id === provider?.linkRow.providerId
                        );
                    })
                    .map((d) => ({
                        label: d.identities.value,
                        value: String(d.identities.id),
                    })),
                wrapperClasses: "col-span-12",
                props: {
                    required: true,
                    className: "w-full",
                    onChange: (val: unknown) => {
                        const v =
                            typeof val === "string"
                                ? val
                                : ((val as any)?.target?.value ?? "");
                        setDomainId(v);
                    },
                },
            },
            {
                name: "displayName",
                label: "Display Name",
                required: true,
                wrapperClasses: "col-span-12",
                bottomStartPrefix: (
                    <span className={"text-xs"}>
						This name will appear as the organizer when you create calendar
						events or send invitations.
					</span>
                ),
                props: {
                    autoComplete: "off",
                    required: true,
                },
            },
            {
                name: "local",
                label: "Local part",
                wrapperClasses: "col-span-12",
                props: {
                    defaultValue: localPart,
                    autoComplete: "off",
                    placeholder: "e.g. support",
                    required: true,
                    onInput: (e: any) => setLocalPart(e.target.value),
                },
                bottomStartPrefix: (
                    <p className="text-xs text-muted-foreground">
                        The part before the “@”. Example: <code>support</code> → support@…
                    </p>
                ),
            },

            {
                name: "value",
                wrapperClasses: "hidden",
                props: { hidden: true, value: composedEmail, readOnly: true },
            },
            {
                name: "providerId",
                wrapperClasses: "hidden",
                props: { hidden: true, defaultValue: provider?.linkRow.providerId },
            },
            {
                name: "kind",
                wrapperClasses: "hidden",
                props: { hidden: true, defaultValue: "email" },
            },
        ] as const;
    }

    const extraFields = React.useMemo(() => {
        if (smtpAccount?.linkRow.accountId === activeId) {
            return getSmtpFields();
        } else if (provider?.linkRow.providerId === activeId) {
            return getNonSmtpFields();
        } else {
            return [];
        }
    }, [provider, smtpAccount, activeId, localPart, subdomain, domainId]);

    const fields = [
        {
            name: "value",
            label: "Email address",
            required: true,
            wrapperClasses: "col-span-12",
            props: {
                autoComplete: "off",
                required: true,
                placeholder: "e.g. receipts@acme.com"
                // readOnly: true,
                // defaultValue: parsedVaultValues.SMTP_USERNAME || "",
            },
        },
        {
            name: "displayName",
            label: "Display Name",
            required: true,
            wrapperClasses: "col-span-12",
            props: {
                autoComplete: "off",
                required: true,
            },
        },
        {
            name: "shared",
            label: <div className={"flex flex-col"}>Share this identity with workspace members <span className={"text-xxs"}>(All members in this workspace will be able to access this identity. A workspace needs to have a default identity.)</span></div>,
            kind: "custom" as const,
            component: Checkbox,
            wrapperClasses: provider || smtpAccount ? "flex col-span-12 flex-row-reverse gap-2 justify-end" : "hidden",
            props: {
                checked: sharedWithWorkspace,
                onChange: (e: any) => {
                    if (!mustBeShared){
                        setSharedWithWorkspace(e.currentTarget.checked);
                    }
                }
            }
        },
        ...(sharedWithWorkspace
                ? []
                : [{
                    name: "workspaceMembers",
                    label: "Assign to workspace members",
                    kind: "custom" as const,
                    component: MultiSelect,
                    wrapperClasses: provider || smtpAccount ? "col-span-12" : "hidden",
                    required: true,
                    props: {
                        data: workspaceMembers.map((member) => ({
                            label: member?.users?.email,
                            value: String(member.workspace_members.userId),
                        })),
                        minLength: 1,
                        required: true,
                        placeholder: "Select members",
                        className: "w-full",
                    },
                }]
        )
    ];

    const finalizeEmail = async () => {
        if (onCompleted) onCompleted();
    };

    return (
        <div>
            <ReusableForm
                action={addNewEmailIdentity}
                onSuccess={finalizeEmail}
                fields={fields}
                formKey={String(activeId)}
            />

            {composedEmail && provider?.linkRow.providerId === activeId && (
                <div className="mt-3 p-3 border rounded-md bg-muted text-sm text-muted-foreground text-center">
                    Preview:
                    <span className="mx-2 font-medium text-foreground">
						{composedEmail}{" "}
					</span>
                </div>
            )}
        </div>
    );
}

export default AddVirtualEmailIdentityForm;
