import { getMessageAddress } from "@common/mail-client";
import type { MessageEntity } from "@db";
import {
	FocusTrap,
	Group,
	Input,
	Select,
	type SelectProps,
	Text,
} from "@mantine/core";
import { Forward, Reply } from "lucide-react";
import { useParams } from "next/navigation";
import type React from "react";
import { useEffect, useMemo, useState } from "react";
import EmailHeaderContacts from "@/components/mailbox/default/editor/email-header-contacts";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";
import { useDynamicContext } from "@/hooks/use-dynamic-context";
import type { FetchIdentityMailboxListResult } from "@/lib/actions/mailbox";

function EditorHeader({ focusOnSubject }: { focusOnSubject?: () => void }) {
	const dict = useOptionalDictionary();
	const { state } = useDynamicContext<{
		isPending: boolean;
		message: MessageEntity;
		showEditorMode: "reply" | "forward" | "compose";
		identityMailboxes: FetchIdentityMailboxListResult;
	}>();

	const [mode, setMode] = useState<"reply" | "forward" | "compose">(
		state.showEditorMode,
	);
	const [ccActive, setCcActive] = useState(false);
	const [bccActive, setBccActive] = useState(false);

	const options = useMemo(
		() => [
			{ value: "reply", label: dict?.mailbox?.reply ?? "Reply", Icon: Reply },
			{
				value: "forward",
				label: dict?.mailbox?.forward ?? "Forward",
				Icon: Forward,
			},
		],
		[dict],
	);

	const toEmail = useMemo(
		() => getMessageAddress(state?.message, "from") || "",
		[state.message],
	);

	const renderOption: SelectProps["renderOption"] = ({ option }) => {
		const ItemIcon =
			options.find((item) => item.value === option.value)?.Icon ?? Reply;
		return (
			<Group gap="xs">
				<ItemIcon size={16} />
				<Text size="sm">{option.label}</Text>
			</Group>
		);
	};

	const CurrentIcon = (options.find((item) => item.value === mode)?.Icon ??
		Reply) as typeof Reply;

	const computedSubject = useMemo(() => {
		if (!state.message) return "";

		const original = state.message.subject?.trim() || "";
		const cleaned = original.replace(/^(re|fwd)\s*:\s*/gi, "");

		if (mode === "reply") {
			return `${dict?.mailbox?.replyPrefix ?? "Re: "}${cleaned}`;
		}
		if (mode === "forward") {
			return `${dict?.mailbox?.forwardPrefix ?? "Fwd: "}${cleaned}`;
		}
		return cleaned;
	}, [dict, mode, state.message]);

	const [subject, setSubject] = useState(computedSubject);
	const [subjectFocus, setSubjectFocus] = useState(false);

	useEffect(() => {
		setSubject(computedSubject);
	}, [computedSubject]);

	const params = useParams() as {
		identityPublicId?: string;
		mailboxSlug?: string;
	};
	const [identityPublicId, setIdentityPublicId] = useState(
		params.identityPublicId || "",
	);
	const fromOptions = useMemo(
		() =>
			state.identityMailboxes.map((item) => ({
				value: item.identity.publicId,
				label: item.identity.value,
			})),
		[state.identityMailboxes],
	);

	const handleRecipientChange = (value: string[]) => {
		if (value.length > 0) setSubjectFocus(true);
	};

	return (
		<>
			<div className="grid gap-2 border-b p-2 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-start">
				{state.message ? (
					<Select
						value={mode}
						name="mode"
						onChange={(value) => value && setMode(value as "reply" | "forward")}
						data={options}
						renderOption={renderOption}
						leftSection={<CurrentIcon size={16} />}
						leftSectionPointerEvents="none"
						variant="unstyled"
						className="w-full sm:w-32"
						comboboxProps={{
							withinPortal: true,
							position: "bottom",
							offset: 8,
							zIndex: 2000,
						}}
					/>
				) : (
					<input type="hidden" name="mode" value={mode} />
				)}

				<div className="flex min-w-0 flex-col gap-2">
					<RecipientRow label={dict?.mailbox?.to ?? "To"}>
						<EmailHeaderContacts
							name="to"
							maxTags={1}
							toEmail={toEmail}
							onChange={handleRecipientChange}
						/>
					</RecipientRow>

					{ccActive && (
						<RecipientRow label={dict?.mailbox?.cc ?? "Cc"}>
							<EmailHeaderContacts
								name="cc"
								toEmail={toEmail}
								onChange={handleRecipientChange}
							/>
						</RecipientRow>
					)}

					{bccActive && (
						<RecipientRow label={dict?.mailbox?.bcc ?? "Bcc"}>
							<EmailHeaderContacts
								name="bcc"
								toEmail={toEmail}
								onChange={handleRecipientChange}
							/>
						</RecipientRow>
					)}
				</div>

				<div className="flex items-center justify-end gap-3 text-sm text-muted-foreground">
					{!ccActive && (
						<button
							type="button"
							onClick={() => setCcActive(true)}
							className="rounded px-1.5 py-1 hover:bg-muted hover:text-foreground"
						>
							{dict?.mailbox?.cc ?? "Cc"}
						</button>
					)}
					{!bccActive && (
						<button
							type="button"
							onClick={() => setBccActive(true)}
							className="rounded px-1.5 py-1 hover:bg-muted hover:text-foreground"
						>
							{dict?.mailbox?.bcc ?? "Bcc"}
						</button>
					)}
				</div>
			</div>

			<div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 border-b px-3 py-2">
				<span className="text-sm text-muted-foreground">
					{dict?.mailbox?.subject ?? "Subject"}
				</span>
				<FocusTrap active={subjectFocus}>
					<Input
						variant="unstyled"
						className="min-w-0"
						name="subject"
						onKeyDown={(event) => {
							if (event.key === "Enter" || event.key === "Tab") {
								event.preventDefault();
								setSubjectFocus(false);
								focusOnSubject?.();
							}
						}}
						value={subject}
						onChange={(event) => setSubject(event.currentTarget.value)}
					/>
				</FocusTrap>
			</div>

			<div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 border-b px-3 py-2">
				<span className="text-sm text-muted-foreground">
					{dict?.mailbox?.from ?? "From"}
				</span>
				<Select
					placeholder={dict?.mailbox?.pickValue ?? "Pick value"}
					size="sm"
					variant="unstyled"
					className="min-w-0"
					name="identityPublicId"
					onChange={(publicId) => {
						if (publicId) setIdentityPublicId(publicId);
					}}
					value={identityPublicId || null}
					data={fromOptions}
					comboboxProps={{
						withinPortal: true,
						position: "bottom-start",
						offset: 8,
						zIndex: 3000,
					}}
				/>
			</div>
		</>
	);
}

function RecipientRow({
	label,
	children,
}: {
	label: string;
	children: React.ReactNode;
}) {
	return (
		<div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] items-center gap-2">
			<span className="text-sm text-muted-foreground">{label}</span>
			<div className="min-w-0">{children}</div>
		</div>
	);
}

export default EditorHeader;
