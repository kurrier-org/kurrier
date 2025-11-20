"use client";
import React from "react";
import { X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ActionIcon } from "@mantine/core";
import {useIsMobile} from "@/hooks/use-mobile";
import Link from "next/link";


export default function NewContactButton({hideOnMobile}: {hideOnMobile?: boolean}) {
    const isMobile = useIsMobile()

    return (
        <>
            {isMobile ? (
                <ActionIcon>
                    <Link href={"/dashboard/contacts/new"}>
                        <Plus className="h-4 w-4" />
                    </Link>
                </ActionIcon>
            ) : (
                <Button asChild={true} hidden={!hideOnMobile} size="lg">
                    <Link href={"/dashboard/contacts/new"}>
                        <Plus className="h-5 w-5" />
                        Create Contact
                    </Link>
                </Button>
            )}

        </>
    );
}
