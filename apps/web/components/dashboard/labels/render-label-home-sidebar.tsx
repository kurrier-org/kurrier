"use client";

import React, { useEffect, useMemo } from "react";
import LabelHome from "@/components/dashboard/labels/label-home";
import { useParams } from "next/navigation";
import { useDynamicContext } from "@/hooks/use-dynamic-context";
import { LabelEntity } from "@db";

type LabelWithCount = LabelEntity & {
    threadCount?: number;
    contactCount?: number;
};

type GlobalLabelsMap = Map<string, LabelWithCount[]>;

function RenderLabelHomeSidebar({ globalLabels }: { globalLabels: GlobalLabelsMap }) {
    const { setState } = useDynamicContext();
    const params = useParams();

    const identityPublicId =
        typeof params.identityPublicId === "string"
            ? params.identityPublicId
            : undefined;

    const labels = useMemo(() => {
        if (!identityPublicId) return [];
        return globalLabels.get(identityPublicId) ?? [];
    }, [globalLabels, identityPublicId]);

    useEffect(() => {
        setState((prev) => ({
            ...prev,
            labels,
        }));
    }, [labels, setState]);

    return (
        <>
            {identityPublicId && <LabelHome />}
        </>
    );
}

export default RenderLabelHomeSidebar;
