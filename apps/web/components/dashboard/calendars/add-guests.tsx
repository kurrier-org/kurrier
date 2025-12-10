import React, { useEffect, useMemo, useState } from "react";
import { ComboboxItem } from "@mantine/core";
import { Users } from "lucide-react";
import SearchableContacts from "@/components/dashboard/contacts/searchable-contacts";
import { useDynamicContext } from "@/hooks/use-dynamic-context";
import { CalendarState } from "@schema";
import GuestList, {
	UiGuest,
	UiGuestStatus,
} from "@/components/dashboard/calendars/guest-list";

type SearchableContactsOption = ComboboxItem & {
	row?: {
		id: string;
		email: string;
		name: string | null;
		avatar?: string | null;
	};
};

function AddGuests({
	name,
	onChange,
}: {
	name: string;
	onChange?: (value: string[]) => void;
}) {
	const { state } = useDynamicContext<CalendarState>();
	const editEvent = state.activePopoverEditEvent;
	const editEventId = editEvent?.id || "";

	const persistedAttendees = state.calendarEventAttendees?.[editEventId] || [];

	const initialGuests = useMemo<UiGuest[]>(
		() =>
			persistedAttendees.map((a) => ({
				email: a.email,
				name: a.name ?? null,
				avatar: (a as any).avatar ?? null,
				contactId: (a as any).contactId ?? null,
				isOrganizer: a.isOrganizer ?? false,
				isPersisted: true,
				partstat: ((a as any).partstat ?? "needs_action") as UiGuestStatus,
			})),
		[persistedAttendees],
	);

	const [newGuests, setNewGuests] = useState<UiGuest[]>([]);

	useEffect(() => {
		setNewGuests([]);
	}, [editEventId]);

	const allGuests = useMemo(() => {
		const map = new Map<string, UiGuest>();
		initialGuests.forEach((g) => map.set(g.email.toLowerCase(), g));
		newGuests.forEach((g) => map.set(g.email.toLowerCase(), g));

		const merged = Array.from(map.values());
		merged.sort((a, b) => Number(b.isOrganizer) - Number(a.isOrganizer));
		return merged;
	}, [initialGuests, newGuests]);

	useEffect(() => {
		onChange?.(allGuests.map((g) => g.email));
	}, [allGuests, onChange]);

	const handleAddGuest = (value: string, option?: SearchableContactsOption) => {
		const email = (option?.row?.email ?? value ?? "").trim();
		if (!email) return;

		const emailLower = email.toLowerCase();
		if (allGuests.some((g) => g.email.toLowerCase() === emailLower)) return;

		const name = option?.row?.name ?? null;
		const avatar = option?.row?.avatar ?? null;
		const contactId = option?.row?.id ?? null;

		setNewGuests((prev) => [
			...prev,
			{
				email,
				name,
				avatar,
				contactId,
				isOrganizer: false,
				isPersisted: false,
				partstat: "needs_action",
			},
		]);
	};

	const handleRemoveGuest = (email: string) => {
		const target = allGuests.find((g) => g.email === email);
		if (!target || target.isOrganizer) return;

		setNewGuests((prev) =>
			prev.filter((g) => g.email.toLowerCase() !== email.toLowerCase()),
		);
	};

	const guestCount = allGuests.length;
	const hiddenValue = allGuests.map((g) => g.email).join(",");

	return (
		<>
			<div className="text-sm my-1.5 font-medium">Add guests</div>

			<SearchableContacts onChange={handleAddGuest} />

			<input type="hidden" name={name} value={hiddenValue} />
			<input
				type="hidden"
				name="attendeePayload"
				value={JSON.stringify({ initialGuests, newGuests })}
			/>

			<GuestList guests={allGuests} onRemoveGuest={handleRemoveGuest} />

			<div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
				<Users size={14} className="shrink-0" />
				<span className="font-medium">
					{guestCount === 1 ? "1 guest" : `${guestCount} guests`}
				</span>
			</div>
		</>
	);
}

export default AddGuests;
