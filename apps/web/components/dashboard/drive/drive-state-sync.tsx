"use client";

import type { DriveState } from "@schema";
import { useEffect } from "react";
import { useDynamicContext } from "@/hooks/use-dynamic-context";

export default function DriveStateSync({ state }: { state: DriveState }) {
	const { setState } = useDynamicContext<DriveState>();

	useEffect(() => {
		setState((currentState) => ({
			...state,
			driveRouteContext:
				currentState.driveRouteContext ?? state.driveRouteContext,
		}));
	}, [setState, state]);

	return null;
}
