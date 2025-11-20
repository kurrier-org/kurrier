"use client";

import { useDisclosure } from "@mantine/hooks";
import {
	Modal,
	ActionIcon,
	ColorPicker,
	Select,
	TextInput,
	Button,
} from "@mantine/core";
import * as React from "react";
import { IconSettings } from "@tabler/icons-react";
import {
	updateLabel,
	deleteLabel,
	FetchLabelsResult,
} from "@/lib/actions/mailbox";
import { DEFAULT_COLORS_SWATCH } from "@common/mail-client";
import { toast } from "sonner";
import colors from "tailwindcss/colors";

function useLabelOptions({ labels }: { labels: FetchLabelsResult }) {
	const options = labels.map((l) => ({
		label: l.name,
		value: l.id,
	}));

	return { options };
}

export default function ManageLabels({
	globalLabels,
}: {
	globalLabels: FetchLabelsResult;
}) {
	const [opened, { open, close }] = useDisclosure(false);

	const { options: labelOptions } = useLabelOptions({ labels: globalLabels });

	const [editLabelId, setEditLabelId] = React.useState<string | null>(null);
	const selectedLabel = React.useMemo(
		() => globalLabels.find((l) => l.id === editLabelId) ?? null,
		[editLabelId, globalLabels],
	);

	const [editName, setEditName] = React.useState("");
	const [editParentId, setEditParentId] = React.useState<string | null>(null);
	const [editColor, setEditColor] = React.useState("#228be6");
	const [isSubmitting, setIsSubmitting] = React.useState(false);

	React.useEffect(() => {
		if (!selectedLabel) return;
		setEditName(selectedLabel.name);
		setEditParentId(selectedLabel.parentId ?? null);
		setEditColor(selectedLabel.colorBg ?? colors.indigo[500]);
	}, [selectedLabel]);

	const handleUpdate = async () => {
		if (!editLabelId) return;
		const trimmed = editName.trim();
		if (!trimmed) return;

		setIsSubmitting(true);
		try {
			await updateLabel({
				id: editLabelId,
				name: trimmed,
				parentId: editParentId || null,
				color: editColor,
			});
		} finally {
			setIsSubmitting(false);
			toast.success("Label updated");
		}
	};

	const handleDelete = async () => {
		if (!editLabelId) return;
		const ok = window.confirm(
			"Delete this label? Messages will remain, but this label will be removed from them.",
		);
		if (!ok) return;

		setIsSubmitting(true);
		try {
			await deleteLabel({ id: editLabelId });
			setEditLabelId(null);
			toast.success("Label deleted");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<>
			<Modal opened={opened} onClose={close} title="Manage labels" size="sm">
				<div className="flex flex-col gap-6">
					<section className="space-y-3">
						<Select
							size="xs"
							label="Choose label"
							placeholder="Select a label to edit…"
							data={labelOptions}
							value={editLabelId}
							onChange={(value) => setEditLabelId(value)}
						/>

						{selectedLabel && (
							<div className="mt-2 grid grid-cols-12 gap-3">
								<div className="col-span-12 md:col-span-6 space-y-2">
									<TextInput
										size="xs"
										label="Label name"
										value={editName}
										onChange={(e) => setEditName(e.currentTarget.value)}
									/>

									<Select
										size="xs"
										label="Nest under (optional)"
										placeholder="No parent"
										data={labelOptions.filter((o) => o.value !== editLabelId)}
										value={editParentId}
										onChange={(v) => setEditParentId(v)}
										clearable
									/>
								</div>

								<div className="col-span-12 md:col-span-6 space-y-2">
									<div className="text-xs font-medium text-muted-foreground">
										Label color
									</div>
									<ColorPicker
										size="sm"
										format="hex"
										swatches={DEFAULT_COLORS_SWATCH}
										value={editColor}
										onChange={setEditColor}
										fullWidth
									/>
								</div>

								<div className="col-span-12 flex items-center justify-between pt-2">
									<Button
										size="xs"
										variant="filled"
										onClick={handleUpdate}
										disabled={isSubmitting || !editLabelId}
									>
										Save changes
									</Button>

									<Button
										size="xs"
										color="red"
										variant="subtle"
										onClick={handleDelete}
										disabled={isSubmitting || !editLabelId}
									>
										Delete label
									</Button>
								</div>
							</div>
						)}
					</section>
				</div>
			</Modal>

			<ActionIcon variant="light" size="xs" onClick={open}>
				<IconSettings size={12} />
			</ActionIcon>
		</>
	);
}
