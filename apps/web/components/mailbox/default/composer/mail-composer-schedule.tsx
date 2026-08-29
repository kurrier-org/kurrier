"use client";

import React, { useMemo, useState } from "react";
import {
    CalendarClock,
    Check,
    ChevronDown,
    SendHorizontal,
    X,
} from "lucide-react";
import {
    Button,
    Divider,
    Menu,
    Modal,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { DateTimePicker } from "@mantine/dates";
import { getTimeZones } from "@vvo/tzdb";
import { getDayjsTz } from "@common/day-js-extended";
import type { Dayjs } from "dayjs";

import { useOptionalDictionary } from "@/components/providers/dictionary-provider";

function formatWhen(date: Date) {
    return new Intl.DateTimeFormat(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
    }).format(date);
}

export default function MailComposerSchedule() {
    const dict = useOptionalDictionary();

    const [scheduledAt, setScheduledAt] =
        useState<Date | null>(null);

    const [
        presetOpened,
        {
            open: openPresets,
            close: closePresets,
        },
    ] = useDisclosure(false);

    const [
        pickerOpened,
        {
            open: openPicker,
            close: closePicker,
        },
    ] = useDisclosure(false);

    const localTimeZone =
        Intl.DateTimeFormat().resolvedOptions().timeZone;

    const dayjsTz = useMemo(
        () => getDayjsTz(localTimeZone),
        [localTimeZone],
    );

    const timeZone = useMemo(
        () =>
            getTimeZones().find((item) =>
                item.group.includes(localTimeZone),
            ),
        [localTimeZone],
    );

    const presets = useMemo(
        () => [
            {
                label:
                    dict?.mailbox?.tomorrowMorningCaps ??
                    "Tomorrow Morning",
                date: dayjsTz()
                    .add(1, "day")
                    .startOf("day")
                    .add(8, "hours"),
            },
            {
                label:
                    dict?.mailbox?.tomorrowAfternoonCaps ??
                    "Tomorrow Afternoon",
                date: dayjsTz()
                    .add(1, "day")
                    .startOf("day")
                    .add(13, "hours"),
            },
            {
                label:
                    dict?.mailbox?.mondayMorningCaps ??
                    "Monday Morning",
                date: dayjsTz()
                    .startOf("week")
                    .add(1, "week")
                    .add(8, "hours"),
            },
        ],
        [dayjsTz, dict],
    );

    const [pickerValue, setPickerValue] =
        useState<Dayjs>(() => dayjsTz());

    const pickerDateValue = pickerValue.isValid()
        ? pickerValue.toDate()
        : null;

    const scheduled = scheduledAt !== null;

    return (
        <>
            <input
                type="hidden"
                name="scheduledSend"
                value={scheduled ? "yes" : "no"}
            />

            {scheduledAt && (
                <input
                    type="hidden"
                    name="scheduledAt"
                    value={scheduledAt.toISOString()}
                />
            )}

            <Modal
                centered
                opened={presetOpened}
                onClose={closePresets}
                title={
                    <span className="text-xl">
						{dict?.mailbox?.scheduleSend ??
                            "Schedule Send"}
					</span>
                }
                size="sm"
                zIndex={4100}
            >
                <div className="my-2 p-2 font-semibold">
                    {timeZone?.alternativeName ??
                        localTimeZone}

                    {timeZone?.abbreviation
                        ? ` (${timeZone.abbreviation})`
                        : null}
                </div>

                <div className="space-y-1">
                    {presets.map((preset) => (
                        <button
                            key={preset.label}
                            type="button"
                            className="flex w-full items-center justify-between rounded px-2 py-2 text-left hover:bg-muted"
                            onClick={() => {
                                setScheduledAt(
                                    preset.date.toDate(),
                                );
                                closePresets();
                            }}
                        >
							<span>
								{preset.label}
							</span>

                            <span className="text-sm text-muted-foreground">
								{preset.date.format(
                                    "MMM DD, hh:mm A",
                                )}
							</span>
                        </button>
                    ))}
                </div>

                <Divider
                    my="lg"
                    variant="dashed"
                />

                <Button
                    type="button"
                    leftSection={
                        <CalendarClock size={16} />
                    }
                    variant="light"
                    fullWidth
                    onClick={() => {
                        closePresets();
                        openPicker();
                    }}
                >
                    {dict?.mailbox?.pickDateAndTime ??
                        "Pick date and time"}
                </Button>
            </Modal>

            <Modal
                centered
                opened={pickerOpened}
                onClose={closePicker}
                title={
                    <span className="text-xl">
						{dict?.mailbox?.scheduleSend ??
                            "Schedule Send"}
					</span>
                }
                size="sm"
                zIndex={4200}
            >
                <DateTimePicker
                    label={
                        dict?.mailbox?.pickDateAndTime ??
                        "Pick date and time"
                    }
                    placeholder={
                        dict?.mailbox?.pickDateAndTime ??
                        "Pick date and time"
                    }
                    value={pickerDateValue}
                    onChange={(value) => {
                        if (!value) return;

                        const nextValue =
                            dayjsTz(value);

                        if (nextValue.isValid()) {
                            setPickerValue(nextValue);
                        }
                    }}
                    valueFormat="DD MMM hh:mm A"
                    popoverProps={{
                        zIndex: 4300,
                    }}
                    className="my-4"
                    timePickerProps={{
                        withDropdown: true,
                        format: "12h",
                        popoverProps: {
                            withinPortal: false,
                        },
                    }}
                />

                <Button
                    type="button"
                    fullWidth
                    onClick={() => {
                        if (!pickerValue.isValid()) {
                            return;
                        }

                        setScheduledAt(
                            pickerValue.toDate(),
                        );

                        closePicker();
                    }}
                >
                    {dict?.mailbox?.schedule ??
                        "Schedule"}
                </Button>
            </Modal>

            <Menu
                shadow="xl"
                width={290}
                zIndex={4000}
                position="top-start"
                withArrow
                arrowSize={12}
            >
                <Menu.Target>
                    <Button
                        type="button"
                        size="sm"
                        title={
                            scheduledAt
                                ? formatWhen(scheduledAt)
                                : dict?.mailbox
                                    ?.scheduleSend ??
                                "Schedule Send"
                        }
                        aria-label={
                            dict?.mailbox?.scheduleSend ??
                            "Schedule Send"
                        }
                        className="!w-10 !min-w-10 !px-0 !rounded-l-sm !rounded-r-full"
                    >
                        {scheduled ? (
                            <CalendarClock size={15} />
                        ) : (
                            <ChevronDown size={15} />
                        )}
                    </Button>
                </Menu.Target>

                <Menu.Dropdown>
                    {!scheduled ? (
                        <Menu.Item
                            leftSection={
                                <SendHorizontal
                                    size={14}
                                />
                            }
                            onClick={openPresets}
                        >
                            {dict?.mailbox
                                    ?.scheduleSend ??
                                "Schedule Send"}
                        </Menu.Item>
                    ) : (
                        <>
                            <Menu.Label>
                                {dict?.mailbox
                                        ?.scheduled ??
                                    "Scheduled"}
                            </Menu.Label>

                            <Menu.Item
                                leftSection={
                                    <Check size={14} />
                                }
                            >
                                {formatWhen(
                                    scheduledAt,
                                )}
                            </Menu.Item>

                            <Menu.Divider />

                            <Menu.Item
                                color="red"
                                leftSection={
                                    <X size={14} />
                                }
                                onClick={() =>
                                    setScheduledAt(
                                        null,
                                    )
                                }
                            >
                                {dict?.mailbox
                                        ?.removeSchedule ??
                                    "Remove schedule"}
                            </Menu.Item>
                        </>
                    )}
                </Menu.Dropdown>
            </Menu>
        </>
    );
}
