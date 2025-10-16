import React, { useEffect, useMemo, useState } from "react";
import {
	ActionIcon,
	Select,
	SelectProps,
	TagsInput,
	Group,
	Text,
	Input,
} from "@mantine/core";
import { Forward, Reply } from "lucide-react";
import { useDynamicContext } from "@/hooks/use-dynamic-context";
import { MessageEntity } from "@db";
import { getMessageAddress } from "@common/mail-client";
import { useMediaQuery } from "@mantine/hooks";

function EditorHeader() {
	const { state } = useDynamicContext<{
		isPending: boolean;
		message: MessageEntity;
		showEditorMode: "reply" | "forward" | "compose";
	}>();

	const [mode, setMode] = useState<"reply" | "forward" | "compose">(
		state.showEditorMode,
	);
	const [ccActive, setCcActive] = useState(false);
	const [bccActive, setBccActive] = useState(false);

	const options = useMemo(
		() => [
			{ value: "reply", label: "Reply", Icon: Reply },
			{ value: "forward", label: "Forward", Icon: Forward },
		],
		[],
	);

	const toEmail = useMemo(() => {
		return getMessageAddress(state?.message, "from") || "";
	}, [state.message]);

	const renderOption: SelectProps["renderOption"] = ({ option }) => {
		const ItemIcon =
			options.find((o) => o.value === option.value)?.Icon ?? Reply;
		return (
			<Group gap="xs">
				<ItemIcon size={16} />
				<Text size={"sm"}>{option.label}</Text>
			</Group>
		);
	};

	const CurrentIcon = (options.find((o) => o.value === mode)?.Icon ??
		Reply) as typeof Reply;

	const computedSubject = useMemo(() => {
		if (!state.message) return "";

		const original = state.message.subject?.trim() || "";

		const cleaned = original.replace(/^(re|fwd)\s*:\s*/gi, "");

		if (mode === "reply") return `Re: ${cleaned}`;
		if (mode === "forward") return `Fwd: ${cleaned}`;
		return cleaned;
	}, [state.message, mode]);

	const [subject, setSubject] = useState(computedSubject);

	useEffect(() => {
		setSubject(computedSubject);
	}, [computedSubject]);

	const isMobile = useMediaQuery("(max-width: 768px)");

	return isMobile ? (
		<>
			{/* Row 1: Select | To | Cc/Bcc */}
			<div
				className="border-b px-3 py-2 grid gap-3
                  grid-cols-1
                  sm:grid-cols-[auto,1fr,auto] sm:items-start"
			>
				{/* Left: reply/forward select */}
				{state.message ? (
					<div className="sm:pt-1">
						<Select
							value={mode}
							name="mode"
							onChange={(v) => v && setMode(v as "reply" | "forward")}
							data={options}
							renderOption={renderOption}
							leftSection={<CurrentIcon size={14} />}
							leftSectionPointerEvents="none"
							variant="unstyled"
							className="text-sm"
							comboboxProps={{
								withinPortal: true,
								position: "bottom",
								offset: 8,
								zIndex: 2000,
							}}
						/>
					</div>
				) : (
					<input type="hidden" name="mode" value={mode} />
				)}

				{/* Middle: To */}
				<div className="grid items-center gap-2 sm:grid-cols-[40px,1fr]">
					<span className="text-[13px] text-muted-foreground sm:text-right leading-6">
						To
					</span>
					<TagsInput
						defaultValue={toEmail ? [toEmail] : []}
						maxTags={1}
						name="to"
						size="sm"
						variant="unstyled"
						className="min-h-[28px] text-sm"
					/>
				</div>

				{/* Right: Cc / Bcc (same row) */}
				<div className="flex items-center justify-end gap-4 text-primary text-sm">
					{!ccActive && (
						<button
							type="button"
							onClick={() => setCcActive(true)}
							className="hover:underline"
							aria-label="Add Cc"
							title="Add Cc"
						>
							Cc
						</button>
					)}
					{!bccActive && (
						<button
							type="button"
							onClick={() => setBccActive(true)}
							className="hover:underline"
							aria-label="Add Bcc"
							title="Add Bcc"
						>
							Bcc
						</button>
					)}
				</div>
			</div>

			{/* Row 2+: Cc / Bcc (only when active) */}
			{ccActive && (
				<div className="border-b px-3 py-2 grid items-center gap-2 sm:grid-cols-[72px,1fr]">
					<span className="text-[13px] text-muted-foreground sm:text-right leading-6">
						Cc
					</span>
					<TagsInput
						name="cc"
						variant="unstyled"
						className="min-h-[28px] text-sm"
					/>
				</div>
			)}

			{bccActive && (
				<div className="border-b px-3 py-2 grid items-center gap-2 sm:grid-cols-[72px,1fr]">
					<span className="text-[13px] text-muted-foreground sm:text-right leading-6">
						Bcc
					</span>
					<TagsInput
						name="bcc"
						variant="unstyled"
						className="min-h-[28px] text-sm"
					/>
				</div>
			)}

			{/* Subject */}
			<div className="border-b px-3 py-2 grid items-center gap-2 sm:grid-cols-[72px,1fr]">
				<span className="text-[13px] text-muted-foreground sm:text-right leading-6">
					Subject
				</span>
				<Input
					variant="unstyled"
					className="w-full text-base"
					name="subject"
					value={subject}
					onChange={(e) => setSubject(e.currentTarget.value)}
				/>
			</div>
		</>
	) : (
		<>
			<div className="border-b p-2 flex gap-2">
				{state.message ? (
					<div className="flex-shrink-0">
						<Select
							value={mode}
							name={"mode"}
							onChange={(v) => v && setMode(v as "reply" | "forward")}
							data={options}
							renderOption={renderOption}
							leftSection={<CurrentIcon size={16} />}
							leftSectionPointerEvents="none"
							variant="unstyled"
							w={130}
							comboboxProps={{
								withinPortal: true,
								position: "bottom",
								offset: 12,
								zIndex: 2000,
							}}
						/>
					</div>
				) : (
					<input type={"hidden"} name={"mode"} value={mode} />
				)}

				<div className="flex-grow flex justify-between">
					<div className="flex gap- items-stretch flex-col justify-start">
						<div className="flex items-center gap-2">
							<span className="text-sm text-muted-foreground">To</span>
							<TagsInput
								defaultValue={toEmail ? [toEmail] : []}
								maxTags={1}
								name={"to"}
								size="sm"
								variant="unstyled"
							/>
						</div>

						{ccActive && (
							<div className="flex items-center gap-2">
								<span className="text-sm text-muted-foreground">Cc</span>
								<TagsInput name={"cc"} variant="unstyled" />
							</div>
						)}

						{bccActive && (
							<div className="flex items-center gap-2">
								<span className="text-sm text-muted-foreground">Bcc</span>
								<TagsInput name={"bcc"} variant="unstyled" />
							</div>
						)}
					</div>

					<div className="flex gap-2 items-center text-sm text-neutral-500">
						{!ccActive && (
							<ActionIcon
								onClick={() => setCcActive(true)}
								variant="transparent"
							>
								Cc
							</ActionIcon>
						)}
						{!bccActive && (
							<ActionIcon
								onClick={() => setBccActive(true)}
								variant="transparent"
							>
								Bcc
							</ActionIcon>
						)}
					</div>
				</div>
			</div>
			<div className={"border-b flex justify-start items-center px-2 gap-2"}>
				<span className="text-sm text-muted-foreground">Subject</span>
				<Input
					variant={"unstyled"}
					className={"w-full"}
					name={"subject"}
					value={subject}
					onChange={(e) => setSubject(e.currentTarget.value)}
				/>
			</div>
		</>
	);
}

export default EditorHeader;
