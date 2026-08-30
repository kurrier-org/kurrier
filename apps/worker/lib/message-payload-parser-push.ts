export function shouldEnqueueNewMailPush(isExistingMessage: boolean) {
	return !isExistingMessage;
}
