import { defineEventHandler, readRawBody } from "h3";

export default defineEventHandler(async (event) => {
    // handle send
    const raw = (await readRawBody(event)) || "";

    console.log("raw", raw)

    return { status: "ok" };
});
