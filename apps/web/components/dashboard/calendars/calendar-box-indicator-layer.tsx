import React, { useEffect, useState } from "react";
import { Dayjs } from "dayjs";
import { dayjsExtended } from "@common/day-js-extended";

function CalendarBoxIndicatorLayer({
	start,
	end,
}: {
	start: Dayjs;
	end: Dayjs;
}) {
	const [now, setNow] = useState<Dayjs | null>(null);

	const refreshNow = () => {
		const current = dayjsExtended();
		if (current.isBetween(start, end, null, "[)")) {
			setNow(current);
		}
	};

	useEffect(() => {
		const interval = setInterval(() => {
			refreshNow();
		}, 10000);
		refreshNow();
		return () => clearInterval(interval);
	}, [start, end]);

	if (!now?.isBetween(start, end, null, "[)")) {
		return (
			<div className="absolute inset-0 z-10 pointer-events-none">
				{/*<CalendarBoxEvents />*/}
			</div>
		);
	}

	const totalMs = end.valueOf() - start.valueOf();
	const elapsedMs = now.valueOf() - start.valueOf();

	let percent = (elapsedMs / totalMs) * 100;
	if (!Number.isFinite(percent)) percent = 0;
	percent = Math.min(100, Math.max(0, percent));

	return (
		<>
			{/*<div className="absolute inset-0 pointer-events-none">*/}
			<div className="absolute inset-0">
				<div className="absolute inset-x-0" style={{ top: `${percent}%` }}>
					<div className="flex items-center">
						<div className="absolute h-3 w-3 rounded-full bg-brand -ml-[6px]" />
						<div className="w-full border border-brand h-0.5 bg-brand" />
					</div>
				</div>
			</div>
		</>
	);
}

export default CalendarBoxIndicatorLayer;
