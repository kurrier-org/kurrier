"use client";

import React, { useEffect } from "react";
import LabelHome from "@/components/dashboard/labels/label-home";
import { useDynamicContext } from "@/hooks/use-dynamic-context";
import { LabelEntity } from "@db";

type LabelWithCount = LabelEntity & {
    contactCount?: number;
};

function RenderContactsLabelHomeSidebar({
                                            globalLabels,
                                        }: {
    globalLabels: LabelWithCount[];
}) {
    const { setState } = useDynamicContext();

    useEffect(() => {
        setState((prev) => ({
            ...prev,
            labels: globalLabels,
        }));
    }, [globalLabels, setState]);

    return <LabelHome />;
}

export default RenderContactsLabelHomeSidebar;
