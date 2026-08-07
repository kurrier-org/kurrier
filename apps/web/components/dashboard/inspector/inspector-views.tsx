export const inspectorViews = [
    "preview",
    "html",
    "plain",
    "raw",
    "headers",
    "smtp",
    "json",
    "delivery",
] as const;

export type InspectorView =
    (typeof inspectorViews)[number];

export function isInspectorView(
    value: string,
): value is InspectorView {
    return inspectorViews.includes(
        value as InspectorView,
    );
}

export function getInspectorViewFromPathname(
    pathname: string,
): InspectorView {
    const finalSegment = pathname
        .split("/")
        .filter(Boolean)
        .at(-1);

    if (
        finalSegment &&
        isInspectorView(finalSegment) &&
        finalSegment !== "preview"
    ) {
        return finalSegment;
    }

    return "preview";
}
