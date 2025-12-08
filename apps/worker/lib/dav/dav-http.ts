import DigestFetch from "digest-fetch";

function escapeXml(value: string) {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&apos;");
}

type BaseOpts = {
    davBaseUrl: string;
    username: string;
    password: string;
    collectionPath: string;
};

export async function createAddressBookViaHttp(opts: BaseOpts & {
    displayName: string;
    description?: string;
}) {
    const { davBaseUrl, username, password, collectionPath, displayName, description } =
        opts;

    const client = new DigestFetch(username, password);
    const fetch = client.fetch.bind(client);

    const base = davBaseUrl.replace(/\/$/, "");
    const collection = collectionPath.replace(/^\//, "");
    const url = `${base}/${collection}`;

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<d:mkcol xmlns:d="DAV:" xmlns:card="urn:ietf:params:xml:ns:carddav">
  <d:set>
    <d:prop>
      <d:displayname>${escapeXml(displayName)}</d:displayname>
      <d:resourcetype>
        <d:collection/>
        <card:addressbook/>
      </d:resourcetype>
      ${
        description
            ? `<card:addressbook-description>${escapeXml(
                description,
            )}</card:addressbook-description>`
            : ""
    }
    </d:prop>
  </d:set>
</d:mkcol>`;

    const res = await fetch(url, {
        method: "MKCOL",
        headers: {
            "Content-Type": 'application/xml; charset="utf-8"',
        },
        body: xml,
    });

    if (![200, 201, 204, 207, 405, 409].includes(res.status)) {
        const text = await res.text().catch(() => "");
        throw new Error(
            `CardDAV MKCOL failed (${res.status} ${res.statusText}): ${text}`,
        );
    }

    return { ok: true, status: res.status };
}


export async function createCalendarViaHttp(opts: BaseOpts & {
    displayName: string;
    description?: string;
    timezone?: string;
}) {
    const { davBaseUrl, username, password, collectionPath, displayName, description, timezone } =
        opts;

    const client = new DigestFetch(username, password);
    const fetch = client.fetch.bind(client);

    const base = davBaseUrl.replace(/\/$/, "");
    const collection = collectionPath.replace(/^\//, "");
    const url = `${base}/${collection}`;

    const xml = `<?xml version="1.0" encoding="utf-8"?>
<c:mkcalendar xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:set>
    <d:prop>
      <d:displayname>${escapeXml(displayName)}</d:displayname>
      <d:resourcetype>
        <d:collection/>
        <c:calendar/>
      </d:resourcetype>
      ${
        timezone
            ? `<c:calendar-timezone>${escapeXml(timezone)}</c:calendar-timezone>`
            : ""
    }
      ${
        description
            ? `<c:calendar-description>${escapeXml(
                description,
            )}</c:calendar-description>`
            : ""
    }
    </d:prop>
  </d:set>
</c:mkcalendar>`;

    const res = await fetch(url, {
        method: "MKCALENDAR",
        headers: {
            "Content-Type": 'application/xml; charset="utf-8"',
        },
        body: xml,
    });

    if (![200, 201, 204, 207, 405, 409].includes(res.status)) {
        const text = await res.text().catch(() => "");
        throw new Error(
            `CalDAV MKCALENDAR failed (${res.status} ${res.statusText}): ${text}`,
        );
    }

    return { ok: true, status: res.status };
}

