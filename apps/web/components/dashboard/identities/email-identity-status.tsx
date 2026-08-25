"use client";

export const dynamic = "force-dynamic"; // or

import React, { useEffect, useState } from "react";
import IsVerifiedStatus from "../providers/is-verified-status";
import {
	FetchUserIdentitiesResult,
	getIdentityById,
} from "@/lib/actions/dashboard";
import { useOptionalDictionary } from "@/components/providers/dictionary-provider";

function EmailIdentityStatus({
	userIdentity,
}: {
	userIdentity: FetchUserIdentitiesResult[number];
}) {
	const dict = useOptionalDictionary();
	const [incoming, setIncoming] = useState<boolean>(false);
	const evaluateStatus = async () => {
		if (userIdentity.identities.domainIdentityId) {
			const domain = await getIdentityById(
				userIdentity.identities.domainIdentityId,
			);
			setIncoming(!!domain.incomingDomain);
		}
	};

	useEffect(() => {
		if (userIdentity) {
			evaluateStatus();
		}
	}, [userIdentity]);

	return (
		<>
			<IsVerifiedStatus
				verified={true}
				statusName={dict?.platform?.outgoing ?? "Outgoing"}
			/>
			<IsVerifiedStatus
				verified={incoming}
				statusName={dict?.platform?.incoming ?? "Incoming"}
			/>
		</>
	);
}

export default EmailIdentityStatus;
