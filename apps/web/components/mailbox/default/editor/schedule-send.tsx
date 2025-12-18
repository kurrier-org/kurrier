import React, { useEffect, useMemo, useState } from "react";
import {
	CalendarClock,
	Check,
	ChevronDown,
	ChevronUp,
	SendHorizonal,
	X,
} from "lucide-react";
import { Button, Divider, Menu, Modal } from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { DateTimePicker } from "@mantine/dates";
import { getTimeZones } from "@vvo/tzdb";
import { getDayjsTz } from "@common/day-js-extended";
import { Dayjs } from "dayjs";

function formatWhen(d: Date) {
	const pad = (n: number) => String(n).padStart(2, "0");
	const h24 = d.getHours();
	const h12 = ((h24 + 11) % 12) + 1;
	const ampm = h24 >= 12 ? "PM" : "AM";
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${h12}:${pad(d.getMinutes())} ${ampm}`;
}

function ScheduleSend() {
	const [scheduledAt, setScheduledAt] = useState<Date | null>(null);

	const scheduled = !!scheduledAt;

	const label = useMemo(() => {
		if (!scheduledAt) return "Schedule Send";
		return `Scheduled • ${formatWhen(scheduledAt)}`;
	}, [scheduledAt]);

	const [opened, { open, close }] = useDisclosure(false);
	const [pickerOpened, { open: openPicker, close: closePicker }] =
		useDisclosure(false);

	const localTz = Intl.DateTimeFormat().resolvedOptions().timeZone;
	const tzs = getTimeZones();
	const tzName = tzs.find((tz) => tz.group.includes(localTz));
	const dayjsTz = getDayjsTz(localTz);
	const presets = [
		{
			label: "Tomorrow Morning",
			date: dayjsTz().endOf("d").add(8, "h").add(1, "m"),
		},
		{
			label: "Tomorrow Afternoon",
			date: dayjsTz().endOf("d").add(13, "h").add(1, "m"),
		},
		{
			label: "Monday Morning",
			date: dayjsTz().endOf("w").add(8, "h").add(1, "m"),
		},
	];

	const [pickerValue, setPickerValue] = useState<Dayjs>(() => dayjsTz());
	const pickerDateValue = useMemo(
		() => (pickerValue.isValid() ? pickerValue.toDate() : null),
		[pickerValue],
	);
	const formatted = useMemo(
		() => (pickerValue.isValid() ? pickerValue.format("DD MMM hh:mm A") : ""),
		[pickerValue],
	);

	useEffect(() => {
		if (!scheduledAt) return;
		console.log("scheduledAt", scheduledAt.toISOString());
		closePicker();
	}, [scheduledAt, closePicker]);

	return (
		<>
			<Modal
				centered
				opened={pickerOpened}
				onClose={closePicker}
				title={<span className={"text-xl"}>Schedule Send</span>}
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
				/>
				<Button
					fullWidth={true}
					onClick={() => {
						if (!pickerValue?.isValid?.()) return;
						setScheduledAt(pickerValue.toDate());
					}}
				>
					Schedule
				</Button>
			</Modal>

			<Modal
				centered
				opened={opened}
				closeOnClickOutside={false}
				onClose={close}
				title={<span className={"text-xl"}>Schedule Send</span>}
				size="sm"
				zIndex={1001}
			>
				<div className={"my-2 p-2 font-semibold"}>
					{tzName?.alternativeName} ({tzName?.abbreviation})
				</div>
				{presets.map((preset) => {
					return (
						<button
							key={preset.label}
							className={
								"w-full px-2 text-left rounded hover:bg-gray-100 flex gap-4 justify-between dark:hover:bg-neutral-700"
							}
							onClick={() => {
								setScheduledAt(preset.date.toDate());
								close();
							}}
						>
							<span className={"my-1"}>{preset.label}</span>
							<span>{preset.date.format("MMM DD, hh:mm A")}</span>
						</button>
					);
				})}

				<Divider my={"lg"} variant={"dashed"} />

				<Button
					leftSection={<CalendarClock size={16} />}
					variant={"light"}
					fullWidth={true}
					onClick={() => {
						close();
						openPicker();
					}}
				>
					Pick date and time
				</Button>
			</Modal>

			{scheduled ? (
				<input type="hidden" name="scheduledSend" value="yes" />
			) : (
				<input type="hidden" name="scheduledSend" value="no" />
			)}

			{scheduledAt ? (
				<input
					type="hidden"
					name="scheduledAt"
					value={scheduledAt.toISOString()}
				/>
			) : null}

			<Menu
				shadow="xl"
				width={260}
				zIndex={1001}
				position="top-start"
				withArrow
				arrowSize={14}
				arrowRadius={2}
				arrowPosition="center"
			>
				<Menu.Target>
					<Button
						type="button"
						size="sm"
						className="!px-2 !rounded-l-xs !rounded-r-4xl"
					>
						<span className="inline-flex items-center gap-1.5">
							{scheduled ? <CalendarClock size={14} /> : null}

							{!scheduled ? (
								<>
									<ChevronDown
										size={14}
										className="group-data-[expanded=true]:hidden"
									/>
									<ChevronUp
										size={14}
										className="hidden group-data-[expanded=true]:block"
									/>
								</>
							) : (
								<span className="text-[11px] leading-none text-white/90">
									{formatWhen(scheduledAt!)}
								</span>
							)}
						</span>
					</Button>
				</Menu.Target>

				<Menu.Dropdown>
					{!scheduled ? (
						<>
							<Menu.Item
								leftSection={<SendHorizonal size={14} />}
								onClick={open}
							>
								Schedule Send
							</Menu.Item>
						</>
					) : (
						<>
							<Menu.Item
								leftSection={<Check size={14} />}
								rightSection={
									<span className="text-[11px] text-neutral-500">
										{formatWhen(scheduledAt!)}
									</span>
								}
								onClick={() => {}}
							>
								Scheduled
							</Menu.Item>

							<Menu.Divider />

							<Menu.Item
								leftSection={<X size={14} />}
								onClick={() => setScheduledAt(null)}
							>
								Remove schedule
							</Menu.Item>
						</>
					)}
				</Menu.Dropdown>
			</Menu>
		</>
	);
}

export default ScheduleSend;
