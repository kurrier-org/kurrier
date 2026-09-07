import { DISTRIBUTION_ACCESS as OSS_ACCESS } from "../oss/access";
import { DEFAULT_DISTRIBUTION } from "../constants";

const distribution =
    process.env.NEXT_PUBLIC_KURRIER_DISTRIBUTION ??
    DEFAULT_DISTRIBUTION;

export const DISTRIBUTION_ACCESS = (() => {
    switch (distribution) {
        case DEFAULT_DISTRIBUTION:
            return OSS_ACCESS;

        default:
            throw new Error(
                `Distribution access not found for distribution: ${distribution}`,
            );
    }
})();
