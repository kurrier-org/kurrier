import { EventSlotFragment, EventSlotRenderFragment } from "@schema";

type AnyFrag = EventSlotFragment | EventSlotRenderFragment;

function clusterByOverlap(fragments: AnyFrag[]): AnyFrag[][] {
	const sorted = [...fragments].sort(
		(a, b) => a.topPercent - b.topPercent || b.heightPercent - a.heightPercent,
	);

	const groups: AnyFrag[][] = [];
	let current: AnyFrag[] | null = null;
	let currentMaxBottom = -Infinity;

	for (const frag of sorted) {
		const bottom = frag.topPercent + frag.heightPercent;

		if (!current || frag.topPercent >= currentMaxBottom) {
			// starts a new, non-overlapping cluster
			current = [frag];
			groups.push(current);
			currentMaxBottom = bottom;
		} else {
			// overlaps with the current cluster
			current.push(frag);
			if (bottom > currentMaxBottom) currentMaxBottom = bottom;
		}
	}

	return groups;
}

export function layoutDayFragments(
	fragments: EventSlotFragment[],
): EventSlotRenderFragment[] {
	const groups = clusterByOverlap(fragments);
	const laidOut: EventSlotRenderFragment[] = [];

	for (const group of groups) {
		const columns: EventSlotRenderFragment[][] = [];

		for (const frag of group) {
			let placed = false;

			for (let colIndex = 0; colIndex < columns.length; colIndex++) {
				const col = columns[colIndex];
				const last = col[col.length - 1];
				const lastBottom = last.topPercent + last.heightPercent;

				// if this fragment starts after the last one in this column ends,
				// they don't overlap vertically → can reuse this column
				if (frag.topPercent >= lastBottom) {
					const placedFrag: EventSlotRenderFragment = {
						...frag,
						columnIndex: colIndex,
						columnCount: 0, // fill later
					};
					col.push(placedFrag);
					laidOut.push(placedFrag);
					placed = true;
					break;
				}
			}

			if (!placed) {
				const placedFrag: EventSlotRenderFragment = {
					...frag,
					columnIndex: columns.length,
					columnCount: 0, // fill later
				};
				columns.push([placedFrag]);
				laidOut.push(placedFrag);
			}
		}

		const groupColCount = columns.length;
		for (const col of columns) {
			for (const f of col) {
				f.columnCount = groupColCount;
			}
		}
	}

	return laidOut;
}

export function splitFragmentIntoHours(
	base: EventSlotRenderFragment,
): EventSlotRenderFragment[] {
	const totalMinutes = 24 * 60;

	const startMinute = (base.topPercent / 100) * totalMinutes;
	const durationMinutes = (base.heightPercent / 100) * totalMinutes;
	const endMinute = startMinute + durationMinutes;

	const firstHour = Math.floor(startMinute / 60);
	const lastHour = Math.floor((endMinute - 1) / 60); // inclusive

	const result: EventSlotRenderFragment[] = [];

	for (let h = firstHour; h <= lastHour; h++) {
		const hourStart = h * 60;
		const hourEnd = (h + 1) * 60;

		const overlapStart = Math.max(startMinute, hourStart);
		const overlapEnd = Math.min(endMinute, hourEnd);
		if (overlapEnd <= overlapStart) continue;

		const offsetInHour = overlapStart - hourStart;
		const minutesInHour = overlapEnd - overlapStart;

		const topPercentHour = (offsetInHour / 60) * 100;
		const heightPercentHour = (minutesInHour / 60) * 100;

		result.push({
			...base,
			hour: h,
			topPercent: topPercentHour,
			heightPercent: heightPercentHour,
			isStart: h === firstHour ? base.isStart : false,
			isEnd: h === lastHour ? base.isEnd : false,
		});
	}

	return result;
}
