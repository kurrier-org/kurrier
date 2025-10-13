import type { CollectionCreateSchema } from "typesense/lib/Typesense/Collections";
import { AddressObjectJSON } from "./mail";

export const messagesSearchSchema: CollectionCreateSchema = {
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

export type SearchResult = {
	id: string;
	subject: string | null;
	text: string | null;
	snippet: string;
	createdAt?: number; // optional if you decide to include it later
};

export interface ThreadHit {
	id: string;
	threadId: string;
	subject: string | null;
	snippet: string;
	fromName: string | null;
	fromEmail: string | null;
	participants: string[];
	labels: string[];
	hasAttachment: boolean;
	unread: boolean;
	createdAt: number;
	lastInThreadAt: number;

	starred: boolean;
}

export type ToSearchDocInput = {
	id: string;
	ownerId: string;
	mailboxId: string;
	threadId: string;

	subject?: string | null;
	text?: string | null;
	html?: string | null;

	fromName?: string | null;
	fromEmail?: string | null;

	from?: AddressObjectJSON | null;
	to?: AddressObjectJSON | null;
	cc?: AddressObjectJSON | null;
	bcc?: AddressObjectJSON | null;

	hasAttachments?: boolean;
	seen?: boolean;
	sizeBytes?: number | null;
	createdAt?: Date | string | null;
	lastInThreadAt?: Date | string | null;

	labels?: string[] | null;
};

export type SearchThreadsResponse = {
	items: ThreadHit[];
	totalThreads: number;
	totalMessages: number;
};
