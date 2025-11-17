"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.messagesSearchSchema = void 0;
exports.messagesSearchSchema = {
    name: "messages",
    fields: [
        { name: "ownerId", type: "string", facet: true },
        { name: "mailboxId", type: "string", facet: true },
        { name: "threadId", type: "string", facet: true },
        { name: "subject", type: "string" },
        { name: "text", type: "string" },
        { name: "html", type: "string" },
        { name: "snippet", type: "string" },
        { name: "fromName", type: "string" },
        { name: "fromEmail", type: "string", facet: true },
        { name: "fromDomain", type: "string", facet: true },
        // NEW: Array fields
        { name: "participants", type: "string[]", facet: true },
        { name: "labels", type: "string[]", facet: true },
        // Flags / numbers stored as ints
        { name: "hasAttachment", type: "int32", facet: true },
        { name: "unread", type: "int32", facet: true },
        { name: "sizeBytes", type: "int32" },
        { name: "starred", type: "int32", facet: true },
        // Sortable timestamps
        { name: "createdAt", type: "int64", facet: true, sort: true },
        { name: "lastInThreadAt", type: "int64", facet: true, sort: true },
    ],
};
