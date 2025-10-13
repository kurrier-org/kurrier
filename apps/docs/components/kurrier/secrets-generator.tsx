"use client";

import { useState } from "react";
import { generateSecrets } from "@/lib/generate-secrets";

export default function SecretsGenerator() {
	const [secret, setSecret] = useState("");

	const generate = async () => {
		const secrets = await generateSecrets();
		setSecret(secrets);
	};

	return (
		<div className={"overflow-y-scroll overflow-x-auto"}>
			<button
				onClick={generate}
				className="rounded bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700"
			>
				Generate Secrets
			</button>

			{secret && (
				<div className="my-6 font-mono text-sm text-gray-700 dark:text-gray-200 whitespace-pre">
					{secret.trim()}
				</div>
			)}
		</div>
	);
}
