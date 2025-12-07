import React from "react";
import { X } from "lucide-react";
import ContactListAvatar from "@/components/dashboard/contacts/contact-list-avatar";

export type UiGuestStatus =
    | "accepted"
    | "declined"
    | "tentative"
    | "needs_action"
    | null;

export type UiGuest = {
    email: string;
    name: string | null;
    avatar: string | null;
    contactId: string | null;
    isOrganizer: boolean;
    isPersisted: boolean;
    partstat: UiGuestStatus;
};

type GuestListProps = {
    guests: UiGuest[];
    onRemoveGuest?: (email: string) => void;
};

function GuestList({ guests, onRemoveGuest }: GuestListProps) {
    const renderStatusBadge = (guest: UiGuest) => {
        const partstat = guest.partstat ?? "needs_action";

        if (partstat === "accepted") {
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
          <span className="h-3 w-3 rounded-full bg-emerald-500" />
          Accepted
        </span>
            );
        }

        if (partstat === "tentative") {
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
          <span className="h-3 w-3 rounded-full border border-amber-700" />
          Tentative
        </span>
            );
        }

        if (partstat === "declined") {
            return (
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-semibold text-rose-700">
          <span className="h-3 w-3 rounded-full bg-rose-500" />
          Declined
        </span>
            );
        }

        // needs_action
        return (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
        <span className="h-3 w-3 rounded-full border border-amber-700" />
        Awaiting response
      </span>
        );
    };

    if (!guests.length) return null;

    return (
        <div className="mt-2 space-y-1.5 max-h-52 overflow-y-auto">
            {guests.map((guest) => (
                <div
                    key={guest.email}
                    className="flex items-center justify-between rounded-xl bg-muted/70 px-3 py-2 text-xs hover:bg-muted transition-colors"
                >
                    <div className="flex items-center gap-2.5">
                        <ContactListAvatar
                            signedUrl={guest.avatar}
                            alt={guest.name || guest.email}
                            size={24}
                        />
                        <div className="flex flex-col">
              <span className="text-[13px] font-medium leading-snug">
                {guest.name || guest.email}
              </span>
                            {guest.name && (
                                <span className="text-[11px] leading-tight text-muted-foreground">
                  {guest.email}
                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5">
                        {guest.isOrganizer && (
                            <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-700">
                Organizer
              </span>
                        )}

                        {renderStatusBadge(guest)}

                        {!guest.isPersisted && !guest.isOrganizer && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                New
              </span>
                        )}

                        {!guest.isOrganizer && onRemoveGuest && (
                            <button
                                type="button"
                                onClick={() => onRemoveGuest(guest.email)}
                                className="rounded-full p-1 hover:bg-foreground/10"
                                aria-label={`Remove ${guest.email}`}
                            >
                                <X size={12} />
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
}

export default GuestList;
