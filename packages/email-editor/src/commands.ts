import type { EmailBlock, EmailDocument } from "./types";

type BlockUpdater = (block: EmailBlock) => EmailBlock;

export const addBlock = (
    document: EmailDocument,
    block: EmailBlock,
    index = document.blocks.length,
): EmailDocument => {
    const blocks = [...document.blocks];
    const targetIndex = Math.max(0, Math.min(index, blocks.length));

    blocks.splice(targetIndex, 0, block);

    return {
        ...document,
        blocks,
    };
};

export const updateBlock = (
    document: EmailDocument,
    blockId: string,
    updater: BlockUpdater,
): EmailDocument => {
    const index = document.blocks.findIndex((block) => block.id === blockId);

    if (index === -1) {
        return document;
    }

    const blocks = [...document.blocks];
    blocks[index] = updater(blocks[index]);

    return {
        ...document,
        blocks,
    };
};

export const removeBlock = (
    document: EmailDocument,
    blockId: string,
): EmailDocument => {
    if (!document.blocks.some((block) => block.id === blockId)) {
        return document;
    }

    return {
        ...document,
        blocks: document.blocks.filter((block) => block.id !== blockId),
    };
};

export const duplicateBlock = (
    document: EmailDocument,
    blockId: string,
): EmailDocument => {
    const index = document.blocks.findIndex((block) => block.id === blockId);

    if (index === -1) {
        return document;
    }

    const duplicate = structuredClone(document.blocks[index]);
    duplicate.id = crypto.randomUUID();

    const blocks = [...document.blocks];
    blocks.splice(index + 1, 0, duplicate);

    return {
        ...document,
        blocks,
    };
};

export const moveBlock = (
    document: EmailDocument,
    blockId: string,
    targetIndex: number,
): EmailDocument => {
    const currentIndex = document.blocks.findIndex(
        (block) => block.id === blockId,
    );

    if (currentIndex === -1) {
        return document;
    }

    const boundedTargetIndex = Math.max(
        0,
        Math.min(targetIndex, document.blocks.length - 1),
    );

    if (currentIndex === boundedTargetIndex) {
        return document;
    }

    const blocks = [...document.blocks];
    const [block] = blocks.splice(currentIndex, 1);
    blocks.splice(boundedTargetIndex, 0, block);

    return {
        ...document,
        blocks,
    };
};
