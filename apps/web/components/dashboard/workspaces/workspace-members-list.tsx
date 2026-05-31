import React from "react";
import { FetchWorkspaceMembersResult } from "@/lib/actions/workspace";

function WorkspaceMembersList({
                                  members,
                              }: {
    members: FetchWorkspaceMembersResult;
}) {
    if (!members || members.length === 0) {
        return (
            <div className="rounded-2xl border border-neutral-200 bg-white px-4 py-10
                      dark:border-neutral-800 dark:bg-neutral-950">
                <div className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">
                    No members found
                </div>
            </div>
        );
    }

    return (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white
                    dark:border-neutral-800 dark:bg-neutral-950">
            <div
                className="grid grid-cols-12 px-4 py-3 text-xs font-medium
                   bg-neutral-100 text-neutral-600
                   dark:bg-neutral-900/60 dark:text-neutral-300"
            >
                <div className="col-span-8">Email</div>
                <div className="col-span-4">Role</div>
            </div>

            <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                {members.map((m) => {
                    const member = m.workspace_members;
                    const user = m.users;

                    return (
                        <div
                            key={member.id}
                            className="grid grid-cols-12 items-center px-4 py-3
                         hover:bg-neutral-50
                         dark:hover:bg-neutral-900/40"
                        >
                            <div className="col-span-8 text-sm text-neutral-800 dark:text-neutral-200">
                                {user?.email}
                            </div>

                            <div className="col-span-4">
                <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium
                    ${
                        member.role === "owner"
                            ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
                            : "bg-neutral-200 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300"
                    }`}
                >
                  {member.role}
                </span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

export default WorkspaceMembersList;
