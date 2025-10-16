import React, { useRef, useState } from "react";
import { ActionIcon, Button, Popover, Progress } from "@mantine/core";
import { Baseline, Paperclip, X as IconX } from "lucide-react";
import { RichTextEditor } from "@mantine/tiptap";
import { useDynamicContext } from "@/hooks/use-dynamic-context";
import { createClient } from "@/lib/supabase/client";
import type { PublicConfig } from "@schema";
import { v4 as uuidv4 } from "uuid";
import { extension } from "mime-types";
import { MessageEntity } from "@db";

type UploadItem = {
	name: string;
	path: string;
	size: number;
	progress: number; // 0..100
	status: "uploading" | "done" | "error";
	error?: string;
};

// --- Optional: make progress visibly slower for demo/debug
const SLOW_MODE = false; // set false for real-time progress
const SLOW_MS_PER_PERCENT = 20; // lower=faster

const formatBytes = (n: number) => {
	if (!Number.isFinite(n)) return "";
	const units = ["B", "K", "MB", "GB"];
	let i = 0;
	while (n >= 1024 && i < units.length - 1) {
		n /= 1024;
		i++;
	}
	return `${Math.round(n)}${units[i]}`;
};

export default function EditorFooter() {
	const { state } = useDynamicContext<{
		publicConfig: PublicConfig;
		isPending: boolean;
		message: MessageEntity;
	}>();
	const inputRef = useRef<HTMLInputElement | null>(null);
	const [uploads, setUploads] = useState<UploadItem[]>([]);
	const [attachments, setAttachments] = useState<Record<any, any>[]>([]);

	const newMessageId = useRef(uuidv4());

	const triggerUpload = () => inputRef.current?.click();

	/**
	 * Upload with XHR (so we get native progress events).
	 * We animate progress updates to look smooth (and optionally slow).
	 */
	const uploadFile = async (
		bucket: string,
		path: string,
		file: File,
		token: string,
	): Promise<void> => {
		const url = `${state.publicConfig.API_PUBLIC_URL}/storage/v1/object/${bucket}/${path}`;

		await new Promise<void>((resolve, reject) => {
			const xhr = new XMLHttpRequest();
			xhr.open("POST", url);
			xhr.setRequestHeader("Authorization", `Bearer ${token}`);
			xhr.setRequestHeader("x-upsert", "true");

			let lastPct = 0;

			const animateTo = (target: number) => {
				if (!SLOW_MODE) {
					lastPct = target;
					setUploads((prev) =>
						prev.map((u) =>
							u.path === path ? { ...u, progress: lastPct } : u,
						),
					);
					return;
				}
				const step = () => {
					if (lastPct < target) {
						lastPct += 1;
						setUploads((prev) =>
							prev.map((u) =>
								u.path === path ? { ...u, progress: lastPct } : u,
							),
						);
						setTimeout(step, SLOW_MS_PER_PERCENT);
					}
				};
				step();
			};

			xhr.upload.onprogress = (evt) => {
				if (!evt.lengthComputable) return;
				const pct = Math.max(
					0,
					Math.min(100, Math.round((evt.loaded / evt.total) * 100)),
				);
				if (pct > lastPct) animateTo(pct);
			};

			xhr.onload = () => {
				if (xhr.status >= 200 && xhr.status < 300) {
					animateTo(100);
					setAttachments((prev) => [
						...prev,
						{
							path,
							sizeBytes: file.size,
							messageId: newMessageId.current,
							bucketId: bucket,
							filenameOriginal: file.name,
							contentType: file.type,
						},
					]);

					resolve();
				} else {
					reject(xhr.responseText || `HTTP ${xhr.status}`);
				}
			};

			xhr.onerror = () => reject("Network error");
			xhr.send(file);
		});
	};

	const onFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const files = event.target.files;
		if (!files?.length) return;

		const supabase = createClient(state.publicConfig);
		const { data } = await supabase.auth.getSession();
		const token = data.session?.access_token;
		const userId = data.session?.user?.id;
		if (!token || !userId) {
			alert("No auth session found");
			event.target.value = "";
			return;
		}

		const bucket = "attachments";

		for (const file of Array.from(files)) {
			const path = `private/${userId}/${newMessageId.current}/${uuidv4()}.${extension(file.type)}`;

			setUploads((prev) => [
				...prev,
				{
					name: file.name,
					path,
					size: file.size,
					progress: 0,
					status: "uploading",
				},
			]);

			try {
				await uploadFile(bucket, path, file, token);
				setUploads((prev) =>
					prev.map((u) =>
						u.path === path ? { ...u, progress: 100, status: "done" } : u,
					),
				);
			} catch (err) {
				setUploads((prev) =>
					prev.map((u) =>
						u.path === path
							? { ...u, progress: 100, status: "error", error: String(err) }
							: u,
					),
				);
			}
		}

		event.target.value = "";
	};

	const removeUpload = (path: string) => {
		setUploads((prev) => prev.filter((u) => u.path !== path));
		// Optionally: also delete from storage if desired
		// await supabase.storage.from('attachments').remove([path]);
	};

	return (
		<>
			{/* Attachments area */}
			{uploads.length > 0 && (
				<div className="w-full rounded-md p-2 flex flex-col gap-2">
					{uploads.map((u) => {
						const showProgress = u.status === "uploading" && u.progress < 100;
						return (
							<div
								key={u.path}
								className="flex justify-between items-center w-full max-w-xl bg-zinc-100 rounded px-4 py-2"
							>
								{/* left: filename + size */}
								<div className="flex items-center gap-2 min-w-0">
									<a
										href="#"
										className="text-brand font-semibold truncate max-w-[18rem]"
										title={u.name}
										onClick={(e) => e.preventDefault()}
									>
										{u.name}
									</a>
									<span className="text-sm text-zinc-700">
										({formatBytes(u.size)})
									</span>
								</div>

								{/* right: progress (when uploading) + X */}
								<div className="flex items-center gap-2">
									{showProgress && (
										<div className="w-40">
											<Progress
												value={u.progress}
												size="sm"
												radius="xl"
												color="blue"
											/>
										</div>
									)}
									{u.status === "error" && (
										<span
											className="text-xs text-red-600 truncate max-w-[14rem]"
											title={u.error}
										>
											{u.error}
										</span>
									)}
									<ActionIcon
										variant="subtle"
										color="gray"
										onClick={() => removeUpload(u.path)}
										title="Remove"
									>
										<IconX size={16} />
									</ActionIcon>
								</div>
							</div>
						);
					})}
				</div>
			)}

			{/* Footer bar */}
			<div className="border-t items-center flex py-2 px-2">
				<div className="mx-2">
					<Button
						loading={!!state.isPending}
						size="xs"
						radius="xl"
						type="submit"
					>
						Send
					</Button>
				</div>

				<Popover position="top-start" withArrow shadow="md">
					<Popover.Target>
						<ActionIcon variant="transparent" aria-label="Formatting">
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
					aria-label="Attach files"
				>
					<Paperclip size={18} />
				</ActionIcon>

				{state?.message && (
					<input
						type={"hidden"}
						name={"originalMessageId"}
						value={state.message?.id}
					/>
				)}
				<input
					type={"hidden"}
					name={"newMessageId"}
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
