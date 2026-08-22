import {
    getMailboxes,
    type JmapMailboxGetResponse,
} from "./protocol/mailbox";

import {
    downloadEmailBlob,
} from "./protocol/download";
import {
    uploadBlob,
    type JmapBlobUploadResponse,
} from "./protocol/blobs";

import {
    queryEmails,
    getEmails,
    changesEmails,
    type JmapEmailQueryResponse,
    type JmapEmailGetResponse,
    type JmapEmailChangesResponse,
} from "./protocol/email";

import {
    sendEmail,
    type JmapSendEmailInput,
    type JmapSendEmailResult,
} from "./protocol/submission";

export type JmapSession = {
    capabilities: Record<string, unknown>;
    accounts: Record<
        string,
        {
            name: string;
            isPersonal: boolean;
            isReadOnly: boolean;
            accountCapabilities: Record<string, unknown>;
        }
    >;
    primaryAccounts: Record<string, string>;
    username: string;
    apiUrl: string;
    downloadUrl: string;
    uploadUrl: string;
    eventSourceUrl: string;
    state: string;
};

export class JmapClient {
    private session: JmapSession | null = null;

    constructor(
        private readonly token: string,
        private readonly sessionUrl: string,
    ) {}

    async getSession(
        opts?: {
            refresh?: boolean;
        },
    ): Promise<JmapSession> {
        if (this.session && !opts?.refresh) {
            return this.session;
        }

        const response = await fetch(this.sessionUrl, {
            headers: {
                Authorization: `Bearer ${this.token}`,
                Accept: "application/json",
            },
        });

        if (!response.ok) {
            throw new Error(
                `Failed to fetch JMAP session: ${response.status} ${response.statusText}`,
            );
        }

        this.session =
            await response.json() as JmapSession;

        return this.session;
    }

    async refreshSession(): Promise<JmapSession> {
        return this.getSession({
            refresh: true,
        });
    }

    async getMailboxes(
        accountId: string,
    ): Promise<JmapMailboxGetResponse> {
        const session = await this.getSession();

        return getMailboxes(
            this.token,
            session.apiUrl,
            accountId,
        );
    }

    async queryEmails(
        accountId: string,
        mailboxId: string,
    ): Promise<JmapEmailQueryResponse> {
        const session = await this.getSession();

        return queryEmails(
            this.token,
            session.apiUrl,
            accountId,
            mailboxId,
        );
    }

    async getEmails(
        accountId: string,
        ids: string[],
    ): Promise<JmapEmailGetResponse> {
        const session = await this.getSession();

        return getEmails(
            this.token,
            session.apiUrl,
            accountId,
            ids,
        );
    }

    async downloadEmail(
        accountId: string,
        blobId: string,
    ): Promise<Uint8Array> {
        const session = await this.getSession();

        return downloadEmailBlob(
            this.token,
            session.downloadUrl,
            accountId,
            blobId,
        );
    }

    async changesEmails(
        accountId: string,
        sinceState: string,
    ): Promise<JmapEmailChangesResponse> {
        const session = await this.getSession();

        return changesEmails(
            this.token,
            session.apiUrl,
            accountId,
            sinceState,
        );
    }

    async sendEmail(
        input: JmapSendEmailInput,
    ): Promise<JmapSendEmailResult> {
        const session = await this.getSession();

        return sendEmail(
            this.token,
            session,
            input,
        );
    }

    async uploadBlob(
        accountId: string,
        content: Blob,
        contentType: string,
    ): Promise<JmapBlobUploadResponse> {
        const session = await this.getSession();

        return uploadBlob(
            this.token,
            session.uploadUrl,
            accountId,
            content,
            contentType,
        );
    }

}
