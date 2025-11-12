import React, { useState } from "react";
import { deleteMailboxFolder } from "@/lib/actions/mailbox";
import { Menu } from "@mantine/core";

function DeleteMailboxFolder({
	imapOp,
	identityPublicId,
	mailboxId,
}: {
	imapOp: boolean;
	identityPublicId: string;
	mailboxId: string;
}) {
	const [loading, setLoading] = useState(false);
	const [uiDeleted, setUiDeleted] = useState(true);

	const deleteFolder = async () => {
		setLoading(true);
		setUiDeleted(true);
		await deleteMailboxFolder({
			imapOp,
			identityId: identityPublicId,
			mailboxId: mailboxId,
		});
		setLoading(false);
	};

	return (
		<>
			<Menu.Item
				color="red"
				onClick={deleteFolder}
				closeMenuOnClick={false}
				className={uiDeleted ? "hidden" : ""}
			>
				{loading ? "Deleting..." : "Delete"}
			</Menu.Item>
		</>
	);
}

export default DeleteMailboxFolder;
