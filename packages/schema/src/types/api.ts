import { z } from "zod";

const emailAddress = z.string().trim().email();
const recipientsSchema = z.union([
    emailAddress,
    z.array(emailAddress).nonempty(),
]);
const attachmentSchema = z.object({
    filename: z.string().min(1),
    contentType: z.string().min(1),
    content: z.string().min(1),
});

export const EmailSendSchema = z
    .object({
        identityId: z.string().min(1),
        to: emailAddress,
        subject: z.string().min(1),
        html: z.string().min(1).optional(),
        text: z.string().min(1).optional(),
        cc: recipientsSchema.optional(),
        bcc: recipientsSchema.optional(),
        attachments: z.array(attachmentSchema).optional(),
    })
    .refine(
        (data) => !!data.html || !!data.text,
        {
            message: "Either 'html' or 'text' must be provided.",
            path: ["html"],
        },
    );

export type EmailSendInput = z.infer<typeof EmailSendSchema>;
