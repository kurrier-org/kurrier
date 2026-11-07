import { setMailboxFlagsState } from "./flags";
import { moveMailboxMessages } from "./move";
import { deleteMailboxMessages } from "./delete";
import { deleteMailboxMessage } from "./delete-message";
import { createMailboxFolder } from "./create-folder";
import { deleteMailboxFolder } from "./delete-folder";

export const MailboxStore = {
	setFlags: setMailboxFlagsState,
	moveMessages: moveMailboxMessages,
	deleteMessages: deleteMailboxMessages,
	deleteMessage: deleteMailboxMessage,
	createFolder: createMailboxFolder,
	deleteFolder: deleteMailboxFolder,
};
