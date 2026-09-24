"use client";

import type { DriveEntryEntity } from "@db";
import { SegmentedControl, Select, TextInput } from "@mantine/core";
import { LayoutGrid, List, Search } from "lucide-react";
import { useMemo, useState } from "react";
import DriveEntry from "@/components/dashboard/drive/drive-entry";
import NewUploadButton from "@/components/dashboard/drive/new-upload-button";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";

type SortBy = "name" | "newest" | "largest";
type View = "grid" | "list";

function modifiedTime(entry: DriveEntryEntity) {
    const meta = entry.metaData as { lastModified?: unknown } | null;
    const value = meta?.lastModified;
    if (typeof value !== "string") return 0;
    const time = Date.parse(value);
    return Number.isNaN(time) ? 0 : time;
}

export default function DriveEntriesGrid({
                                             entries,
                                         }: {
    entries: DriveEntryEntity[];
}) {
    const dict = useOptionalDictionary();
    const [query, setQuery] = useState("");
    const [sortBy, setSortBy] = useState<SortBy>("name");
    const [view, setView] = useState<View>("grid");

    const visibleEntries = useMemo(() => {
        const search = query.trim().toLocaleLowerCase();

        return entries
            .filter((entry) =>
                entry.name.toLocaleLowerCase().includes(search),
            )
            .sort((a, b) => {
                if (a.type !== b.type) return a.type === "folder" ? -1 : 1;

                if (sortBy === "newest") {
                    const difference = modifiedTime(b) - modifiedTime(a);
                    if (difference) return difference;
                }

                if (sortBy === "largest") {
                    const difference = (b.sizeBytes ?? 0) - (a.sizeBytes ?? 0);
                    if (difference) return difference;
                }

                return a.name.localeCompare(b.name);
            });
    }, [entries, query, sortBy]);

    return (
        <div className="mx-auto w-full max-w-7xl p-4 sm:p-6 lg:p-8">
            <div className="mb-4 flex flex-wrap items-center gap-3">
                <TextInput
                    type="search"
                    size="sm"
                    className="min-w-48 flex-1 sm:max-w-sm"
                    leftSection={<Search size={16} />}
                    placeholder={
                        dict?.drive?.searchFiles ?? "Search files and folders"
                    }
                    aria-label={
                        dict?.drive?.searchFiles ?? "Search files and folders"
                    }
                    value={query}
                    onChange={(event) => setQuery(event.currentTarget.value)}
                />

                <Select
                    size="sm"
                    className="w-36"
                    aria-label={dict?.drive?.sortFiles ?? "Sort files"}
                    data={[
                        { value: "name", label: dict?.drive?.sortName ?? "Name" },
                        {
                            value: "newest",
                            label: dict?.drive?.sortNewest ?? "Newest",
                        },
                        {
                            value: "largest",
                            label: dict?.drive?.sortLargest ?? "Largest",
                        },
                    ]}
                    value={sortBy}
                    allowDeselect={false}
                    onChange={(value) => {
                        if (value) setSortBy(value as SortBy);
                    }}
                />

                <SegmentedControl
                    size="sm"
                    value={view}
                    onChange={(value) => setView(value as View)}
                    data={[
                        {
                            value: "grid",
                            label: (
                                <span className="flex items-center justify-center">
									<LayoutGrid size={16} aria-hidden="true" />
									<span className="sr-only">
										{dict?.drive?.gridView ?? "Grid view"}
									</span>
								</span>
                            ),
                        },
                        {
                            value: "list",
                            label: (
                                <span className="flex items-center justify-center">
									<List size={16} aria-hidden="true" />
									<span className="sr-only">
										{dict?.drive?.listView ?? "List view"}
									</span>
								</span>
                            ),
                        },
                    ]}
                />

                <p className="text-sm font-medium text-muted-foreground">
                    {(dict?.drive?.itemsCount ?? "{count} items").replace(
                        "{count}",
                        String(visibleEntries.length),
                    )}
                </p>

                <NewUploadButton className="hidden sm:ml-auto sm:inline-flex md:hidden" />
            </div>

            {visibleEntries.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                    {dict?.drive?.noMatchingFiles ?? "No matching files or folders."}
                </p>
            ) : (
                <div
                    className={
                        view === "grid"
                            ? "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
                            : "space-y-2"
                    }
                >
                    {visibleEntries.map((entry) => (
                        <DriveEntry key={entry.id} entry={entry} view={view} />
                    ))}
                </div>
            )}
        </div>
    );
}
