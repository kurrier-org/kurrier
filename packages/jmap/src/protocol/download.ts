export async function downloadEmailBlob(
    token: string,
    downloadUrlTemplate: string,
    accountId: string,
    blobId: string,
    name = "message.eml",
    type = "message/rfc822",
): Promise<Uint8Array> {
    const url = downloadUrlTemplate
        .replace("{accountId}", encodeURIComponent(accountId))
        .replace("{blobId}", encodeURIComponent(blobId))
        .replace("{name}", encodeURIComponent(name))
        .replace("{type}", encodeURIComponent(type));

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
            Accept: type,
        },
    });

    if (!response.ok) {
        throw new Error(
            `JMAP download failed: ${response.status} ${response.statusText}`,
        );
    }

    return new Uint8Array(
        await response.arrayBuffer(),
    );
}
