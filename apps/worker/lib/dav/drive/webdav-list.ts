import { XMLParser } from "fast-xml-parser";

export type DriveDiscoveredVolume = {
    code: string;
    label: string;
    basePath: string;
};

const davParser = new XMLParser({
    ignoreAttributes: false,
    ignoreDeclaration: true,
    attributeNamePrefix: "",
    removeNSPrefix: true,
});

export const listVolumes = async (): Promise<DriveDiscoveredVolume[]> => {
    const url = new URL("/disks", process.env.WEB_DAV_URL).toString();

    const res = await fetch(url, {
        method: "PROPFIND",
        headers: {
            Depth: "1",
        },
    });

    if (!res.ok) {
        throw new Error(
            `WebDAV PROPFIND /disks failed: ${res.status} ${res.statusText}`,
        );
    }

    const xml = await res.text();
    const json = davParser.parse(xml);

    const responsesRaw =
        json?.multistatus?.response ??
        json?.["D:multistatus"]?.["D:response"] ??
        [];

    const responses = Array.isArray(responsesRaw) ? responsesRaw : [responsesRaw];

    const volumes: DriveDiscoveredVolume[] = [];

    for (const resp of responses) {
        const href: string | undefined =
            resp?.href ?? resp?.["D:href"] ?? undefined;

        if (!href) continue;

        const decodedHref = decodeURI(href);
        const cleaned = decodedHref.replace(/^\/+|\/+$/g, "");

        if (cleaned === "disks") continue;

        const parts = cleaned.split("/");
        if (parts.length !== 2) continue;
        if (parts[0] !== "disks") continue;

        const code = parts[1];
        if (!code) continue;

        if (volumes.some((v) => v.code === code)) continue;

        const propstat = resp?.propstat ?? resp?.["D:propstat"];
        const prop =
            propstat?.prop ??
            propstat?.["D:prop"] ??
            (Array.isArray(propstat)
                ? propstat[0]?.prop ?? propstat[0]?.["D:prop"]
                : undefined);

        const displayName: string | undefined =
            prop?.displayname ?? prop?.["D:displayname"];

        volumes.push({
            code,
            label: displayName || code,
            basePath: `/disks/${code}`,
        });
    }

    return volumes;
};
