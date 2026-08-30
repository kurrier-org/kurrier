"use client";

import React from "react";
import { RichTextEditor } from "@mantine/tiptap";

export default function MailComposerBody() {
    return (
        <RichTextEditor.Content className="prose min-h-72 p-4 text-sm leading-5" />
    );
}
