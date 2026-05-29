import { ActionIcon, ColorSwatch, Modal, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { Plus, X } from "lucide-react";
import * as React from "react";
import { ReusableForm } from "@/components/common/reusable-form";
import { useMailboxOptions } from "@/hooks/use-mailbox-options";
import {
	addNewMailboxFolder,
	type FetchIdentityMailboxListResult,
} from "@/lib/actions/mailbox";

const FOLDER_COLORS = [
	"#e03131",
	"#e8590c",
	"#f08c00",
	"#2f9e44",
	"#1971c2",
	"#6741d9",
	"#c2255c",
	"#868e96",
];

function ColorPickerField({ name }: { name: string }) {
	const [selected, setSelected] = React.useState<string | null>(null);

	return (
		<div>
			<input type="hidden" name={name} value={selected ?? ""} />
			<div className="flex items-center gap-2 flex-wrap">
				{FOLDER_COLORS.map((color) => (
					<button
						key={color}
						type="button"
						onClick={() => setSelected(color === selected ? null : color)}
						className="p-0 m-0 bg-transparent border-0 rounded-full"
						style={{ lineHeight: 0 }}
					>
						<Tooltip label={color} withArrow>
							<ColorSwatch
								color={color}
								size={20}
								withShadow
								className={`cursor-pointer transition-all ${
									selected === color
										? "ring-2 ring-offset-1 ring-[color:var(--color-brand-500)]"
										: ""
								}`}
								style={{
									transform: selected === color ? "scale(1.1)" : "scale(1)",
								}}
							/>
						</Tooltip>
					</button>
				))}
				{selected && (
					<button
						type="button"
						onClick={() => setSelected(null)}
						className="p-0 m-0 bg-transparent border-0 rounded-full"
						style={{ lineHeight: 0 }}
					>
						<Tooltip label="No color" withArrow>
							<ActionIcon size={20} variant="default" radius="xl">
								<X className="h-3 w-3" />
							</ActionIcon>
						</Tooltip>
					</button>
				)}
			</div>
		</div>
	);
}

export default function AddNewFolder({
	mailboxes,
	identity,
}: {
	mailboxes: FetchIdentityMailboxListResult[number]["mailboxes"];
	identity: FetchIdentityMailboxListResult[number]["identity"];
}) {
	const [opened, { open, close }] = useDisclosure(false);

	const { options: mailboxOptions } = useMailboxOptions({
		mailboxes: mailboxes as FetchIdentityMailboxListResult[number]["mailboxes"],
		identityLabel: identity.value,
	});

	const fields = [
		{
			name: "name",
			label: "Folder Name",
			wrapperClasses: "col-span-12",
			props: {},
		},
		{
			name: "imapOp",
			wrapperClasses: "hidden",
			props: { hidden: true, defaultValue: identity.smtpAccountId },
		},
		{
			name: "identityId",
			wrapperClasses: "hidden",
			props: { hidden: true, defaultValue: identity.id },
		},
		{
			name: "parentId",
			label: "Nest Folder Under (Optional)",
			kind: "select" as const,
			options: mailboxOptions,
			wrapperClasses: "col-span-12",
			props: {
				className: "w-full",
				onChange: (val: unknown) => {
					console.log("Selected parent folder:", val);
				},
			},
		},
		{
			name: "color",
			label: "Color (Optional)",
			kind: "custom" as const,
			component: ColorPickerField,
			wrapperClasses: "col-span-12",
			props: {},
		},
	];

	return (
		<>
			<Modal opened={opened} onClose={close} title="New folder">
				<ReusableForm
					fields={fields}
					onSuccess={close}
					action={addNewMailboxFolder}
				/>
			</Modal>

			<ActionIcon size={10} onClick={open}>
				<Plus />
			</ActionIcon>
		</>
	);
}
