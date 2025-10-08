import React, { useMemo, useState } from "react";
import {
    ActionIcon,
    Select,
    SelectProps,
    TagsInput,
    Group,
    Text, Input,
} from "@mantine/core";
import { Forward, Reply } from "lucide-react";
import { useDynamicContext } from "@/hooks/use-dynamic-context";
import { MessageEntity } from "@db";
import {getMessageAddress} from "@common/mail-client"

function EditorHeader() {
    const { state } = useDynamicContext<{
        isPending: boolean;
        message: MessageEntity;
        showEditorMode: "reply" | "forward" | "compose";
    }>();

	const [mode, setMode] = useState<"reply" | "forward" | "compose">(state.showEditorMode);
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

	return (
		<>
			<div className="border-b p-2 flex gap-2">
                {state.message ? <div className="flex-shrink-0">
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
				</div> : <input type={"hidden"} name={"mode"} value={mode}/>}

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
                <Input variant={"unstyled"} name={'subject'} />
            </div>
		</>
	);
}

export default EditorHeader;
