"use client";

import * as React from "react";
import { Minus, PenLine, X } from "lucide-react";
import { useParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import MailComposer from "./mail-composer";

type MailComposerProps = React.ComponentProps<typeof MailComposer>;

type MailComposerLauncherProps = Pick<
    MailComposerProps,
    "publicConfig" | "identityMailboxes"
>;

export default function MailComposerLauncher({
                                                 publicConfig,
                                                 identityMailboxes,
                                             }: MailComposerLauncherProps) {
    const params = useParams();

    const [open, setOpen] = React.useState(false);
    const [minimized, setMinimized] = React.useState(false);

    const activeIdentityPublicId = React.useMemo(() => {
        const paramValues = Object.values(params).flatMap((value) =>
            Array.isArray(value) ? value : value ? [value] : [],
        );

        return identityMailboxes.find((item) =>
            paramValues.includes(item.identity.publicId),
        )?.identity.publicId;
    }, [params, identityMailboxes]);

    const handleOpen = () => {
        setOpen(true);
        setMinimized(false);
    };

    const handleClose = () => {
        setOpen(false);
        setMinimized(false);
    };

    const handleMinimize = () => {
        setMinimized(true);
    };

    const handleRestore = () => {
        setMinimized(false);
    };

    return (
        <>
            <Button
                type="button"
                onClick={handleOpen}
                className="w-full justify-start gap-2"
            >
                <PenLine size={16} />
                Compose
            </Button>

            {open && (
                <div
                    className={[
                        "fixed z-[1000] overflow-hidden border bg-background shadow-xl",
                        "bottom-0 right-0 w-full",
                        "sm:bottom-4 sm:right-8 sm:w-[560px] sm:rounded-lg",
                        minimized
                            ? "h-auto sm:w-[320px]"
                            : "h-full sm:h-auto",
                    ].join(" ")}
                >
                    <div
                        className={[
                            "flex h-11 items-center justify-between border-b bg-muted/40 px-3",
                            minimized ? "cursor-pointer" : "",
                        ].join(" ")}
                        onClick={minimized ? handleRestore : undefined}
                    >
                        <div className="text-sm font-medium">
                            New message
                        </div>

                        <div
                            className="flex items-center gap-1"
                            onClick={(event) => event.stopPropagation()}
                        >
                            {!minimized && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={handleMinimize}
                                    aria-label="Minimize composer"
                                >
                                    <Minus size={16} />
                                </Button>
                            )}

                            <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={handleClose}
                                aria-label="Close composer"
                            >
                                <X size={16} />
                            </Button>
                        </div>
                    </div>

                    <div className={minimized ? "hidden" : "block"}>
                        <MailComposer
                            publicConfig={publicConfig}
                            identityMailboxes={identityMailboxes}
                            activeIdentityPublicId={activeIdentityPublicId}
                            message={null}
                            onClose={handleClose}
                        />
                    </div>
                </div>
            )}
        </>
    );
}
