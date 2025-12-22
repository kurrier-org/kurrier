"use client"
import React from 'react';
import {ChevronRight, Cog} from "lucide-react";
import { Button } from "@mantine/core";
import Link from "next/link";
import {useParams} from "next/navigation";

function IdentitySettingsLink({identityLabel}: {identityLabel: string}) {
    const params = useParams()
    return <Link href={`/dashboard/mail/${params.identityPublicId}/settings`}>
        <Button size={"sm"} className={"!rounded-full"} leftSection={<Cog size={20} />} variant={"light"} rightSection={<ChevronRight size={16} />}>
            <span className={"font-medium"}>{identityLabel}</span>
        </Button>
    </Link>
}

export default IdentitySettingsLink;
