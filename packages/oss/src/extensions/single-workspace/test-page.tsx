import React from "react";
import { kurrierServer } from "@distribution/kurrier-server";

async function enqueueTestJob() {
    "use server";

    await kurrierServer.jobs.enqueue({
        queue: "oss-example",
        name: "example",
        data: {
            message: "Hello from OSS extension",
        },
    });
}

function TestExtensionPage() {
    return (
        <div>
            <p>This is a test extension page. You can add your custom content here.</p>

            <form action={enqueueTestJob}>
                <button type="submit">Test worker</button>
            </form>
        </div>
    );
}

export default TestExtensionPage;
