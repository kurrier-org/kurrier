import React, { useMemo, useState } from "react";
import {
	ActionIcon,
	Select,
	SelectProps,
	TagsInput,
	Group,
	Text,
} from "@mantine/core";
import { Forward, Reply } from "lucide-react";
import { useDynamicContext } from "@/hooks/use-dynamic-context";
import { MessageEntity } from "@db";
import {fromAddress} from "@schema";

function EditorHeader() {
	const [mode, setMode] = useState<"reply" | "forward">("reply");
	const [ccActive, setCcActive] = useState(false);
	const [bccActive, setBccActive] = useState(false);

	const { state } = useDynamicContext<{
		isPending: boolean;
		message: MessageEntity;
	}>();

	const options = useMemo(
		() => [
			{ value: "reply", label: "Reply", Icon: Reply },
			{ value: "forward", label: "Forward", Icon: Forward },
		],
		[],
	);

	const toEmail = useMemo(() => {
		return fromAddress(state.message) || "";
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

	return (
		<>
			<div className="border-b p-2 flex gap-2">
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

				<div className="flex-grow flex justify-between">
					<div className="flex gap- items-stretch flex-col justify-start">
						<div className="flex items-center gap-2">
							<span className="text-sm text-muted-foreground">To</span>
							<TagsInput
								defaultValue={[toEmail]}
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
		</>
	);
}

export default EditorHeader;
