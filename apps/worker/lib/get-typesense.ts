import { getServerEnv } from "@schema";
import Typesense from "typesense";

const {
	TYPESENSE_API_KEY,
	TYPESENSE_PORT,
	TYPESENSE_PROTOCOL,
	TYPESENSE_HOST,
} = getServerEnv();

const client = new Typesense.Client({
	nodes: [
		{
			host: TYPESENSE_HOST,
			port: Number(TYPESENSE_PORT),
			protocol: TYPESENSE_PROTOCOL,
		},
	],
	apiKey: TYPESENSE_API_KEY,
});

export default client;
