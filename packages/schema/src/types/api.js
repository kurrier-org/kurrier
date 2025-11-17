"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailSendSchema = void 0;
var zod_1 = require("zod");
var emailAddress = zod_1.z.string().trim().email();
var recipientsSchema = zod_1.z.union([
	emailAddress,
	zod_1.z.array(emailAddress).nonempty(),
]);
var attachmentSchema = zod_1.z.object({
	filename: zod_1.z.string().min(1),
	contentType: zod_1.z.string().min(1),
	content: zod_1.z.string().min(1),
});
exports.EmailSendSchema = zod_1.z
	.object({
		identityId: zod_1.z.string().min(1),
		to: emailAddress,
		subject: zod_1.z.string().min(1),
		html: zod_1.z.string().min(1).optional(),
		text: zod_1.z.string().min(1).optional(),
		cc: recipientsSchema.optional(),
		bcc: recipientsSchema.optional(),
		attachments: zod_1.z.array(attachmentSchema).optional(),
	})
	.refine(
		function (data) {
			return !!data.html || !!data.text;
		},
		{
			message: "Either 'html' or 'text' must be provided.",
			path: ["html"],
		},
	);
