export type JmapBlobUploadResponse = {
    accountId: string;
    blobId: string;
    type: string;
    size: number;
};

export async function uploadBlob(
    token: string,
    uploadUrl: string,
    accountId: string,
    content: Blob,
    contentType: string,
): Promise<JmapBlobUploadResponse> {
    const url = uploadUrl.replace(
        "{accountId}",
        encodeURIComponent(accountId),
    );

    const response = await fetch(url, {
        method: "POST",
        headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type":
                contentType || "application/octet-stream",
        },
        body: content,
    });

    if (!response.ok) {
        throw new Error(
            `JMAP blob upload failed: ${response.status} ${response.statusText}`,
        );
    }

    return await response.json() as JmapBlobUploadResponse;
}
