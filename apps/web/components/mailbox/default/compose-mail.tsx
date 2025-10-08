// components/ComposeMail.tsx
"use client";

import React, {useEffect, useRef, useState} from "react";
import {Minus, Maximize2, Paperclip, Send, Smile, X, MailPlus} from "lucide-react";
import EmailEditor, {EmailEditorHandle} from "@/components/mailbox/default/editor/email-editor";
import {PublicConfig} from "@schema";
import {scrollToEditor} from "@/components/mailbox/default/email-renderer";
import {Button} from "@/components/ui/button";
import {fetchMailbox} from "@/lib/actions/mailbox";
import {useParams} from "next/navigation";

export default function ComposeMail({publicConfig}: {publicConfig: PublicConfig}) {
    const [open, setOpen] = useState(false);
    const [appeared, setAppeared] = useState(false); // for enter animation
    const [minimized, setMinimized] = useState(false);
    const [expanded, setExpanded] = useState(false);
    const [sentMailboxId, setSentMailboxId] = useState<string | undefined>(undefined);

    const params = useParams()

    const fetchSentMailbox = async () => {
        const {activeMailbox} = await fetchMailbox(String(params.identityPublicId), "sent");
        setSentMailboxId(String(activeMailbox.id))
    };

    useEffect(() => {
        if (!open) return;
        fetchSentMailbox()
        const t = setTimeout(() => setAppeared(true), 16); // next paint
        return () => clearTimeout(t);
    }, [open]);

    const handleOpen = () => {
        setOpen(true);
        setMinimized(false);
        setExpanded(false);
    };

    const handleClose = () => {
        // we’ll skip exit animation to keep code simple
        setOpen(false);
        setAppeared(false);
    };

    const [showEditor, setShowEditor] = useState<boolean>(false);
    const [showEditorMode, setShowEditorMode] = useState<string>("compose");
    const editorRef = useRef<EmailEditorHandle>(null);

    return (
        <>

            <Button size="lg" onClick={handleOpen}>
                <MailPlus className="h-5 w-5" />
                Compose
            </Button>

            {open && (
                <div
                    className={[
                        "fixed z-[1000] bg-background border shadow-xl rounded-2xl overflow-hidden",
                        "right-4 bottom-4",
                        // only fix the size when expanded; otherwise let it auto-size
                        expanded ? "w-[720px] h-[70vh]" : "w-[520px] h-auto",
                        "transition-[width,height] duration-200 ease-out",
                        "motion-safe:transition-opacity motion-safe:duration-200 motion-safe:ease-out",
                        "motion-safe:transition-transform",
                        appeared ? "opacity-100 translate-y-0 scale-100" : "opacity-0 translate-y-3 scale-[0.98]",
                        "hover:shadow-2xl"
                    ].join(" ")}
                >
                    {/* Header ... unchanged */}
                    <div className="flex items-center justify-between border-b px-4 py-2">
                        <div className="text-sm font-medium">New Message</div>
                        <div className="flex items-center gap-2">
                            <IconBtn label={minimized ? "Restore" : "Minimize"} onClick={() => setMinimized(v => !v)}>
                                <Minus className="h-4 w-4" />
                            </IconBtn>
                            <IconBtn label={expanded ? "Restore size" : "Expand"} onClick={() => setExpanded(v => !v)}>
                                <Maximize2 className="h-4 w-4" />
                            </IconBtn>
                            <IconBtn label="Close" onClick={handleClose}>
                                <X className="h-4 w-4" />
                            </IconBtn>
                        </div>
                    </div>

                    {/* Body: auto height; clamp only when expanded; collapse with grid rows */}
                    <div
                        className={[
                            "px-0 pb-0",              // no extra padding
                            "grid",                   // grid trick to animate height
                            minimized ? "grid-rows-[0fr] opacity-0" : "grid-rows-[1fr] opacity-100",
                            "transition-[grid-template-rows,opacity] duration-200 ease-out",
                            "overflow-hidden",
                            expanded ? "max-h-[calc(70vh-48px)]" : "max-h-none" // clamp only if expanded (48px ~ header)
                        ].join(" ")}
                    >
                        {/* Editor wrapper: make sure child can shrink properly */}
                        <div className="min-h-0">
                            <EmailEditor
                                sentMailboxId={String(sentMailboxId)}
                                ref={editorRef}
                                publicConfig={publicConfig}
                                message={null}
                                onReady={() => requestAnimationFrame(() => editorRef.current?.focus())}
                                showEditorMode={showEditorMode}
                            />
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

function IconBtn({
                     label,
                     onClick,
                     children
                 }: {
    label: string;
    onClick?: () => void;
    children: React.ReactNode;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            aria-label={label}
            title={label}
            className="p-2 rounded-md hover:bg-muted transition-colors"
        >
            {children}
        </button>
    );
}




// "use client"
// import React, {useState} from 'react';
// import {MailPlus, Maximize2, Minus, Paperclip, Send, Smile, X} from "lucide-react";
// import {Button} from "@/components/ui/button";
// import {Dialog, DialogContent, DialogHeader, DialogTitle} from "@/components/ui/dialog";
// import {Drawer, Modal, Paper} from "@mantine/core";
// import {useDisclosure} from "@mantine/hooks";
//
// function ComposeMail() {
//     const [open, setOpen] = useState(false);
//     const [minimized, setMinimized] = useState(false);
//     const [expanded, setExpanded] = useState(false);
//
//     return <>
//         {/*<Button size={"lg"} onClick={() => setOpen(true)}>*/}
//         {/*    <MailPlus />*/}
//         {/*    Compose*/}
//         {/*</Button>*/}
//
//         <button
//             onClick={() => {
//                 setOpen(true);
//                 setMinimized(false);
//                 setExpanded(false);
//             }}
//             className="rounded-md border px-3 py-2 text-sm font-medium hover:bg-muted"
//         >
//             Compose
//         </button>
//
//         {/* Composer */}
//         {open && (
//             <div
//                 // Stick to bottom-right; when expanded stretch taller/wider
//                 className={[
//                     "fixed z-[1000] bg-background border shadow-xl rounded-2xl overflow-hidden",
//                     "right-4 bottom-4",
//                     expanded ? "w-[720px] h-[70vh]" : "w-[520px] h-auto",
//                 ].join(" ")}
//                 // Allow vertical resize while not expanded
//                 style={!expanded ? { resize: "vertical" as const } : undefined}
//             >
//                 {/* Header */}
//                 <div className="flex items-center justify-between border-b px-4 py-2">
//                     <div className="text-sm font-medium">New Message</div>
//                     <div className="flex items-center gap-2">
//                         <IconBtn
//                             label="Minimize"
//                             onClick={() => setMinimized((v) => !v)}
//                         >
//                             <Minus className="h-4 w-4" />
//                         </IconBtn>
//                         <IconBtn
//                             label="Expand"
//                             onClick={() => setExpanded((v) => !v)}
//                         >
//                             <Maximize2 className="h-4 w-4" />
//                         </IconBtn>
//                         <IconBtn label="Close" onClick={() => setOpen(false)}>
//                             <X className="h-4 w-4" />
//                         </IconBtn>
//                     </div>
//                 </div>
//
//                 {/* Body */}
//                 {!minimized && (
//                     <div className="p-4">
//                         <input
//                             placeholder="To"
//                             className="w-full h-9 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
//                         />
//                         <input
//                             placeholder="Subject"
//                             className="mt-3 w-full h-9 rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
//                         />
//                         <textarea
//                             placeholder="Message..."
//                             className="mt-3 w-full min-h-[160px] rounded-md border bg-background p-3 text-sm outline-none focus:ring-2 focus:ring-ring"
//                             style={{ resize: "vertical" }}
//                         />
//
//                         {/* Footer */}
//                         <div className="mt-3 flex items-center justify-between">
//                             <button className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90">
//                                 <Send className="h-4 w-4" />
//                                 Send
//                             </button>
//                             <div className="flex items-center gap-2 text-muted-foreground">
//                                 <IconBtn label="Attach">
//                                     <Paperclip className="h-4 w-4" />
//                                 </IconBtn>
//                                 <IconBtn label="Emoji">
//                                     <Smile className="h-4 w-4" />
//                                 </IconBtn>
//                             </div>
//                         </div>
//                     </div>
//                 )}
//             </div>
//         )}
//
//
//     </>
// }
//
// function IconBtn({
//                      label,
//                      onClick,
//                      children,
//                  }: {
//     label: string;
//     onClick?: () => void;
//     children: React.ReactNode;
// }) {
//     return (
//         <button
//             type="button"
//             onClick={onClick}
//             aria-label={label}
//             title={label}
//             className="p-2 rounded-md hover:bg-muted transition"
//         >
//             {children}
//         </button>
//     );
// }
//
// export default ComposeMail;
