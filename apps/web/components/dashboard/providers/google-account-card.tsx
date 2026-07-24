"use client";

import * as React from "react";
import {
    FetchGoogleAccountsResultRow,
    verifyGoogleAccount,
} from "@/lib/actions/dashboard";
import { cn } from "@/lib/utils";
import { Badge, Button } from "@mantine/core";
import { Mail, Play, RefreshCw, ShieldCheck, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

type GoogleStatus = "connected" | "error" | "revoked";

export default function GoogleAccountCard({
                                              googleAccount
                                          }: {
    googleAccount: FetchGoogleAccountsResultRow
}) {

    const [imageFailed, setImageFailed] = React.useState(false);
    const [testing, setTesting] = React.useState(false);
    const [liveStatus, setLiveStatus] = React.useState<GoogleStatus>(
        googleAccount.status as GoogleStatus,
    );
    const [liveError, setLiveError] = React.useState<string | null>(
        googleAccount.lastError ?? null,
    );

    const isConnected = liveStatus === "connected";
    const isBroken = liveStatus === "error" || liveStatus === "revoked";

    const canSend =
        isConnected &&
        googleAccount.scopes?.includes("https://www.googleapis.com/auth/gmail.send");

    const canSync =
        isConnected &&
        googleAccount.scopes?.includes("https://www.googleapis.com/auth/gmail.modify");

    const pictureUrl = googleAccount.pictureUrl
        ? `${googleAccount.pictureUrl}${
            googleAccount.pictureUrl.includes("?") ? "&" : "?"
        }sz=96`
        : null;

    const initiateVerifyGoogle = async () => {
        setTesting(true);

        try {
            const res = await verifyGoogleAccount(googleAccount.id);
            const verify = res.data as any;

            if (verify?.ok) {
                setLiveStatus("connected");
                setLiveError(null);

                toast.success("Google connection verified", {
                    description: String(verify.meta?.email ?? googleAccount.email),
                });
            } else {
                const nextStatus = verify?.status === "revoked" ? "revoked" : "error";
                const message =
                    verify?.message ||
                    res.error ||
                    "Could not verify this Google account. Try reconnecting.";

                setLiveStatus(nextStatus);
                setLiveError(message);

                toast.error("Google verification failed", {
                    description: message,
                });
            }
        } catch (err: any) {
            const message =
                err?.message ?? "Unexpected error during Google verification.";

            setLiveStatus("error");
            setLiveError(message);

            toast.error("Verification error", {
                description: message,
            });
        } finally {
            setTesting(false);
        }
    };

    return (
        <div
            className={cn(
                "col-span-12",
                "rounded-lg border text-brand-foreground p-5 bg-card border-border",
            )}
        >
            <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-3">
                        {pictureUrl && !imageFailed ? (
                            <img
                                src={pictureUrl}
                                alt=""
                                referrerPolicy="no-referrer"
                                onError={() => setImageFailed(true)}
                                className="size-10 shrink-0 rounded-full object-cover bg-muted"
                            />
                        ) : (
                            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-muted">
                                <Mail className="size-4" />
                            </div>
                        )}

                        <div className="min-w-0">
                            <div className="truncate text-base font-medium">
                                {googleAccount.name || googleAccount.email}
                            </div>
                            <div className="truncate text-sm text-muted-foreground">
                                {googleAccount.email}
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Badge
                            size="sm"
                            variant="light"
                            color={isConnected ? "green" : isBroken ? "red" : "gray"}
                        >
                            {liveStatus}
                        </Badge>

                        {canSend && (
                            <Badge size="sm" variant="light" color="blue">
                                Send enabled
                            </Badge>
                        )}

                        {canSync && (
                            <Badge size="sm" variant="light" color="violet">
                                Sync enabled
                            </Badge>
                        )}
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                        {isConnected ? (
                            <>
                                <ShieldCheck className="h-3.5 w-3.5" />
                                OAuth connected
                            </>
                        ) : (
                            <>
                                <ShieldAlert className="h-3.5 w-3.5 text-red-500" />
                                OAuth needs reconnect
                            </>
                        )}
                    </div>

                    {liveError && (
                        <div className="mt-2 text-xs text-red-500">{liveError}</div>
                    )}

                    <div className="my-3 flex flex-wrap gap-2">
                        <Button
                            leftSection={<Play className="size-4" />}
                            loading={testing}
                            onClick={initiateVerifyGoogle}
                            size="xs"
                            variant="filled"
                        >
                            Verify Connection
                        </Button>

                        <Button
                            component="a"
                            href="/api/oauth/google/connect"
                            leftSection={<RefreshCw className="size-4" />}
                            size="xs"
                            variant="filled"
                        >
                            Reconnect
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
