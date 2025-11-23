import { defineEventHandler, createEventStream } from "h3";
import { createClient } from "../../server/utils/create-client";
import { registerConn, unregisterConn } from "../../server/utils/sse-utils";

export default defineEventHandler(async (event) => {
	const supabase = await createClient(event);
	const { data, error } = await supabase.auth.getUser();
	if (error || !data.user) {
		event.node.res.statusCode = 401;
		return "Unauthorized";
	}

	const userId = data.user.id;
	const stream = createEventStream(event);

	registerConn(userId, stream);

	// example: send initial "ready" event
	stream.push(`event: ready\ndata: ${JSON.stringify({ userId })}\n\n`);

	// heartbeat so connection isn’t dropped
	const keepalive = setInterval(() => {
		stream.push(`: keepalive ${Date.now()}\n\n`);
	}, 25_000);

	stream.onClosed(async () => {
		clearInterval(keepalive);
		unregisterConn(userId, stream);
		await stream.close();
	});

	return stream.send();
});
