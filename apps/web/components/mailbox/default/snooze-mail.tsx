"use client";

import React, { useMemo, useState } from "react";
import { Button, Divider, Modal, Tooltip } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { DateTimePicker } from "@mantine/dates";
import { getTimeZones } from "@vvo/tzdb";
import { getDayjsTz } from "@common/day-js-extended";
import { Dayjs } from "dayjs";
import { CalendarClock, Clock4, X } from "lucide-react";
import { snoozeThread } from "@/lib/actions/mailbox";

function formatWhen(d: Date) {
	const pad = (n: number) => String(n).padStart(2, "0");
	const h24 = d.getHours();
	const h12 = ((h24 + 11) % 12) + 1;
	const ampm = h24 >= 12 ? "PM" : "AM";
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${h12}:${pad(d.getMinutes())} ${ampm}`;
}

type Props = {
	mailboxThreadId: string;
	activeMailboxId: string;
	initialSnoozedUntil?: Date | null;
};

export default function SnoozeMail({
	mailboxThreadId,
	activeMailboxId,
	initialSnoozedUntil = null,
}: Props) {
	const [snoozedUntil, setSnoozedUntil] = useState<Date | null>(
		initialSnoozedUntil,
	);
	const [saving, setSaving] = useState(false);

	const [presetsOpened, presetsDisclosure] = useDisclosure(false);
	const [pickerOpened, pickerDisclosure] = useDisclosure(false);

	const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const tzs = getTimeZones();
	const tzName = tzs.find((tz) => tz.group.includes(localTz));
	const dayjsTz = getDayjsTz(localTz);

	const presets = useMemo(
		() => [
			{ label: "Later today", date: dayjsTz().add(2, "h") },
			{
				label: "Tomorrow morning",
				date: dayjsTz().endOf("d").add(8, "h").add(1, "m"),
			},
			{
				label: "Tomorrow afternoon",
				date: dayjsTz().endOf("d").add(13, "h").add(1, "m"),
			},
			{
				label: "Monday morning",
				date: dayjsTz().endOf("w").add(8, "h").add(1, "m"),
			},
		],
		[dayjsTz],
	);

	const [pickerValue, setPickerValue] = useState<Dayjs>(() => dayjsTz());
	const pickerDateValue = useMemo(
		() => (pickerValue.isValid() ? pickerValue.toDate() : null),
		[pickerValue],
	);

	const snoozed = !!snoozedUntil;

	const label = useMemo(() => {
		if (!snoozedUntil) return "Snooze";
		return `Snoozed • ${formatWhen(snoozedUntil)}`;
	}, [snoozedUntil]);

	async function commit(next: Date | null) {
		if (saving) return;

		setSaving(true);
		try {
			await snoozeThread({
				mailboxThreadId,
				activeMailboxId,
				snoozedUntil: next ? next.toISOString() : null,
			});

			setSnoozedUntil(next);
			presetsDisclosure.close();
			pickerDisclosure.close();
		} finally {
			setSaving(false);
		}
	}

	return (
		<>
			<Modal
				centered
				opened={pickerOpened}
				onClose={pickerDisclosure.close}
				title={<span className="text-xl">Snooze</span>}
				size="sm"
				zIndex={1003}
			>
				<DateTimePicker
					label="Pick date and time"
					placeholder="Pick date and time"
					value={pickerDateValue}
					onChange={(val) => {
						if (!val) return;
						const d = dayjsTz(val);
						if (d.isValid()) setPickerValue(d);
					}}
					valueFormat="DD MMM hh:mm A"
					popoverProps={{ zIndex: 1004 }}
					className="my-4"
					timePickerProps={{
						withDropdown: true,
						popoverProps: { withinPortal: false },
						format: "12h",
					}}
					disabled={saving}
				/>

				<Button
					fullWidth
					loading={saving}
					onClick={() => {
						if (!pickerValue?.isValid?.()) return;
						commit(pickerValue.toDate());
					}}
				>
					Snooze
				</Button>
			</Modal>

			<Modal
				centered
				opened={presetsOpened}
				closeOnClickOutside={false}
				onClose={presetsDisclosure.close}
				title={<span className="text-xl">Snooze</span>}
				size="sm"
				zIndex={1001}
			>
				<div className="my-2 p-2 font-semibold">
					{tzName?.alternativeName} ({tzName?.abbreviation})
				</div>

				{presets.map((preset) => (
					<button
						key={preset.label}
						type="button"
						disabled={saving}
						className="w-full items-center px-2 text-left rounded hover:bg-gray-100 flex gap-4 justify-between dark:hover:bg-neutral-700 disabled:opacity-50"
						onClick={() => commit(preset.date.toDate())}
					>
						<span className="my-1">{preset.label}</span>
						<span>{preset.date.format("MMM DD, hh:mm A")}</span>
					</button>
				))}

				<Divider my="lg" variant="dashed" />

				<Button
					leftSection={<CalendarClock size={16} />}
					variant="light"
					fullWidth
					disabled={saving}
					onClick={() => {
						presetsDisclosure.close();
						pickerDisclosure.open();
					}}
				>
					Pick date and time
				</Button>
			</Modal>

			<div className="inline-flex items-center gap-1 mx-1">
				<Tooltip label={label} withArrow position="top" openDelay={250}>
					<button
						type="button"
						disabled={saving}
						onClick={() => {
							if (snoozed) {
								commit(null);
								return;
							}
							presetsDisclosure.open();
						}}
					>
						<Clock4 size={16} />
					</button>
				</Tooltip>
			</div>
		</>
	);
}
