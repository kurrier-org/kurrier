"use client";

import React, {
    createContext,
    useContext,
} from "react";

const InspectorSlotContext =
    createContext<React.ReactNode>(null);

export function InspectorSlotProvider({
                                          children,
                                          inspector,
                                      }: {
    children: React.ReactNode;
    inspector: React.ReactNode;
}) {
    return (
        <InspectorSlotContext.Provider value={inspector}>
            {children}
        </InspectorSlotContext.Provider>
    );
}

export function useInspectorSlot() {
    return useContext(InspectorSlotContext);
}
