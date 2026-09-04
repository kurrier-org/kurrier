import { registerExtensions as registerOssExtensions } from "../oss/register/server";
import { DEFAULT_DISTRIBUTION } from "../constants";

const distribution =
    process.env.NEXT_PUBLIC_KURRIER_DISTRIBUTION ?? DEFAULT_DISTRIBUTION;

export const registerServerExtensions = (): void => {
    switch (distribution) {
        case DEFAULT_DISTRIBUTION:
            registerOssExtensions();
            return;

        default:
            throw new Error(
                `Server extensions not found for distribution: ${distribution}`,
            );
    }
};
