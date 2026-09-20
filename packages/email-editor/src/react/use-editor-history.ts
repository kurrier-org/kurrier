"use client";

import {
    useCallback,
    useEffect,
    useReducer,
    useRef,
} from "react";
import type { EmailDocument } from "../types";

type HistoryEntry = {
    key: string | null;
    timestamp: number;
};

export function useEditorHistory(
    value: EmailDocument,
    onChange: (document: EmailDocument) => void,
) {
    const pastRef = useRef<EmailDocument[]>([]);
    const futureRef = useRef<EmailDocument[]>([]);
    const lastCommitRef = useRef<HistoryEntry | null>(null);
    const emittedValueRef = useRef<EmailDocument | null>(null);
    const [, refresh] = useReducer((count) => count + 1, 0);

    useEffect(() => {
        if (emittedValueRef.current === value) {
            emittedValueRef.current = null;
            return;
        }

        pastRef.current = [];
        futureRef.current = [];
        lastCommitRef.current = null;
        refresh();
    }, [value]);

    const emit = useCallback(
        (document: EmailDocument) => {
            emittedValueRef.current = document;
            onChange(document);
            refresh();
        },
        [onChange],
    );

    const commit = useCallback(
        (document: EmailDocument, mergeKey?: string) => {
            if (document === value) {
                return;
            }

            const timestamp = Date.now();
            const lastCommit = lastCommitRef.current;

            const shouldMerge =
                mergeKey !== undefined &&
                lastCommit?.key === mergeKey &&
                timestamp - lastCommit.timestamp < 750;

            if (!shouldMerge) {
                pastRef.current.push(value);

                if (pastRef.current.length > 100) {
                    pastRef.current.shift();
                }
            }

            futureRef.current = [];
            lastCommitRef.current = {
                key: mergeKey ?? null,
                timestamp,
            };

            emit(document);
        },
        [emit, value],
    );

    const undo = useCallback(() => {
        const previous = pastRef.current.pop();

        if (!previous) {
            return;
        }

        futureRef.current.push(value);
        lastCommitRef.current = null;
        emit(previous);
    }, [emit, value]);

    const redo = useCallback(() => {
        const next = futureRef.current.pop();

        if (!next) {
            return;
        }

        pastRef.current.push(value);
        lastCommitRef.current = null;
        emit(next);
    }, [emit, value]);

    return {
        commit,
        undo,
        redo,
        canUndo: pastRef.current.length > 0,
        canRedo: futureRef.current.length > 0,
    };
}
