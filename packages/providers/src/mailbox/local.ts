import type { MailboxProvider, MailboxFlagOperation } from "../core";

export class LocalMailboxProvider implements MailboxProvider {
    async setFlags(input: {
        threadId: string;
        mailboxId: string;
        op: MailboxFlagOperation;
    }): Promise<void> {}

    async moveMessages(input: {
        sourcePath: string;
        destinationPath: string;
        uids: number[];
    }): Promise<Map<number, number> | undefined> {
        return undefined;
    }

    async deleteMessages(input: {
        mailboxPath: string;
        uids: number[];
    }): Promise<void> {}

    async createFolder(input: { path: string }): Promise<void> {}

    async deleteFolder(input: { path: string }): Promise<void> {}
}
