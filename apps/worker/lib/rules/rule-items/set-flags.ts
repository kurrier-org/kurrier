import { getRedis } from "../../../lib/get-redis";
import type { MailboxFlagOperation } from "@providers";

export async function setFlags(
    threadId: string,
    mailboxId: string,
    op: MailboxFlagOperation,
) {
    if (!threadId || !mailboxId) return;

    const { smtpQueue, smtpEvents } = await getRedis();

    const job = await smtpQueue.add(
        "mail:set-flags",
        { threadId, mailboxId, op },
        {
            attempts: 3,
            backoff: { type: "exponential", delay: 1500 },
            removeOnComplete: true,
            removeOnFail: false,
        },
    );

    await job.waitUntilFinished(smtpEvents);
}
