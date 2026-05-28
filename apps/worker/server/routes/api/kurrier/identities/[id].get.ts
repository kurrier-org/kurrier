import { defineEventHandler, getRouterParam } from "h3";
import {apiSuccess, validateApiKey, validateIdentityOwnership} from "../../../../../lib/api-helpers";

export default defineEventHandler(async (event) => {

	const { ownerId } = await validateApiKey(event);
	const id = getRouterParam(event, "id");
	const identity = await validateIdentityOwnership({
		identityId: String(id),
		ownerId,
	});
	return apiSuccess(identity);

});
