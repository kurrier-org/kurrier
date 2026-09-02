import { registerExtension } from "@extensions";
import { DISTRIBUTION_EXTENSIONS } from "../extensions";

let registered = false;

export const registerDistribution = (): void => {
    console.info("[distribution] registering OSS distribution");

    if (registered) {
        return;
    }

    registered = true;

    for (const extension of DISTRIBUTION_EXTENSIONS) {
        console.info(
            "[distribution] registering extension",
            extension.manifest.id,
        );

        registerExtension(extension);
    }
};
