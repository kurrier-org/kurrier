import { DEFAULT_DISTRIBUTION } from "../config";
import { registerExtensions as registerOssExtensions } from "../oss/register/web";

const distribution =
    process.env.NEXT_PUBLIC_KURRIER_DISTRIBUTION ?? DEFAULT_DISTRIBUTION;

export const registerWebExtensions = (): void => {
    switch (distribution) {
        case DEFAULT_DISTRIBUTION:
            registerOssExtensions();
            return;

        default:
            throw new Error(
                `Web extensions not found for distribution: ${distribution}`,
            );
    }
};
