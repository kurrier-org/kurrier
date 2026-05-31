"use client";

import React, { useRef, useState } from "react";
import { ActionIcon, Button, Popover, Progress } from "@mantine/core";
import { Baseline, Paperclip, X as IconX } from "lucide-react";
import { RichTextEditor } from "@mantine/tiptap";
import { useDynamicContext } from "@/hooks/use-dynamic-context";
import { v4 as uuidv4 } from "uuid";
import { MessageEntity } from "@db";
import ScheduleSend from "@/components/mailbox/default/editor/schedule-send";
import {createAttachmentDownloadUrl, createAttachmentUploadUrl} from "@/lib/actions/uploads-actions";

type UploadItem = {
	name: string;
	size: number;
	progress: number;
	status: "uploading" | "done" | "error";
	error?: string;
};

const formatBytes = (n: number) => {
	if (!Number.isFinite(n)) return "";
	const units = ["B", "KB", "MB", "GB"];
	let i = 0;
	while (n >= 1024 && i < units.length - 1) {
		n /= 1024;
		i++;
	}
	return `${Math.round(n)}${units[i]}`;
};

export default function EditorFooter() {
	const { state } = useDynamicContext<{
		isPending: boolean;
		message: MessageEntity;
	}>();

	const inputRef = useRef<HTMLInputElement | null>(null);
	const [uploads, setUploads] = useState<UploadItem[]>([]);
	const [attachments, setAttachments] = useState<any[]>([]);

	const newMessageId = useRef(uuidv4());

	const triggerUpload = () => inputRef.current?.click();

	const uploadFile = async (file: File): Promise<void> => {
		const { uploadUrl, key } = await createAttachmentUploadUrl({
			fileName: file.name,
			contentType: file.type,
			messageId: newMessageId.current,
		});

		await new Promise<void>((resolve, reject) => {
			const xhr = new XMLHttpRequest();
			xhr.open("PUT", uploadUrl);
			xhr.setRequestHeader(
				"Content-Type",
				file.type || "application/octet-stream"
			);

			xhr.upload.onprogress = (evt) => {
				if (!evt.lengthComputable) return;
				const pct = Math.round((evt.loaded / evt.total) * 100);

				setUploads((prev) =>
					prev.map((u) =>
						u.name === file.name ? { ...u, progress: pct } : u
					)
				);
			};

			xhr.onload = () => {
				if (xhr.status >= 200 && xhr.status < 300) resolve();
				else reject(`Upload failed: ${xhr.status}`);
			};

			xhr.onerror = () => reject("Network error");

			xhr.send(file);
		});

		setAttachments((prev) => [
			...prev,
			{
				path: key,
				sizeBytes: file.size,
				messageId: newMessageId.current,
				// bucketId: process.env.NEXT_PUBLIC_S3_BUCKET,
				filenameOriginal: file.name,
				contentType: file.type,
			},
		]);
	};

	const onFileSelect = async (
		event: React.ChangeEvent<HTMLInputElement>
	) => {
		const files = event.target.files;
		if (!files?.length) return;

		for (const file of Array.from(files)) {
			setUploads((prev) => [
				...prev,
				{
					name: file.name,
					size: file.size,
					progress: 0,
					status: "uploading",
				},
			]);

			try {
				await uploadFile(file);

				setUploads((prev) =>
					prev.map((u) =>
						u.name === file.name
							? { ...u, progress: 100, status: "done" }
							: u
					)
				);
			} catch (err) {
				setUploads((prev) =>
					prev.map((u) =>
						u.name === file.name
							? {
								...u,
								progress: 100,
								status: "error",
								error: String(err),
							}
							: u
					)
				);
			}
		}

		event.target.value = "";
	};

	const removeUpload = (name: string) => {
		setUploads((prev) => prev.filter((u) => u.name !== name));
	};
	console.log("isPending", state)

	return (
		<>
			{uploads.length > 0 && (
				<div className="w-full rounded-md p-2 flex flex-col gap-2">
					{uploads.map((u) => {
						const showProgress =
							u.status === "uploading" && u.progress < 100;

						return (
							<div
								key={u.name}
								className="flex justify-between items-center w-full max-w-xl bg-zinc-100 dark:bg-neutral-900 rounded-xl px-4 py-3"
							>
								<div className="flex items-center gap-3 min-w-0 flex-1">
									<Paperclip size={16} className="text-neutral-500 shrink-0" />

									<div className="min-w-0 flex-1">
										{u.status === "done" ? (
											<button
												type="button"
												className="truncate font-semibold text-sm text-base-600 hover:underline text-left w-full underline"
												onClick={async () => {
													const attachment = attachments.find(
														(a) => a.filenameOriginal === u.name
													);
													if (!attachment) return;

													const { url } = await createAttachmentDownloadUrl(
														attachment.path
													);

													window.open(url, "_blank");
												}}
											>
												{u.name}
											</button>
										) : (
											<div className="truncate font-semibold text-sm text-neutral-900 dark:text-neutral-100">
												{u.name}
											</div>
										)}

										<div className="text-xs text-neutral-500">
											{formatBytes(u.size)}
										</div>
									</div>
								</div>

								<div className="flex items-center gap-3">
									{showProgress && (
										<div className="w-32">
											<Progress
												value={u.progress}
												size="sm"
												radius="xl"
											/>
										</div>
									)}


									<ActionIcon
										variant="subtle"
										color="gray"
										onClick={() => removeUpload(u.name)}
									>
										<IconX size={16} />
									</ActionIcon>
								</div>
							</div>
						);
					})}
				</div>
			)}

			<div className="border-t items-center flex py-2 px-2">
				<div className="mx-2 flex items-center gap-[1px]">
					<Button
						loading={!!state.isPending}
						size="sm"
						type="submit"
						className="!rounded-l-4xl !rounded-r-xs"
					>
						Send
					</Button>
					<ScheduleSend />
				</div>

				<Popover position="top-start" withArrow shadow="md">
					<Popover.Target>
						<ActionIcon variant="transparent">
							<Baseline />
						</ActionIcon>
					</Popover.Target>
					<Popover.Dropdown className="!p-0">
						<RichTextEditor.Toolbar
							sticky
							stickyOffset={60}
							className="!border-0"
						>
							<RichTextEditor.ControlsGroup>
								<RichTextEditor.Bold />
								<RichTextEditor.Italic />
								<RichTextEditor.Underline />
								<RichTextEditor.Strikethrough />
								<RichTextEditor.ClearFormatting />
							</RichTextEditor.ControlsGroup>

							<RichTextEditor.ControlsGroup>
								<RichTextEditor.BulletList />
								<RichTextEditor.OrderedList />
							</RichTextEditor.ControlsGroup>

							<RichTextEditor.ControlsGroup>
								<RichTextEditor.Undo />
								<RichTextEditor.Redo />
							</RichTextEditor.ControlsGroup>
						</RichTextEditor.Toolbar>
					</Popover.Dropdown>
				</Popover>

				<ActionIcon
					onClick={triggerUpload}
					variant="transparent"
					className="mx-2"
				>
					<Paperclip size={18} />
				</ActionIcon>

				{state?.message && (
					<input
						type="hidden"
						name="originalMessageId"
						value={state.message.id}
					/>
				)}

				<input
					type="hidden"
					name="newMessageId"
					value={newMessageId.current}
				/>

				<input
					type="hidden"
					name="attachments"
					value={JSON.stringify(attachments)}
				/>

				<input
					ref={inputRef}
					type="file"
					multiple
					hidden
					onChange={onFileSelect}
				/>
			</div>
		</>
	);
}
