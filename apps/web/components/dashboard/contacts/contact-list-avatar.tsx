import React from 'react';
import NextImage from "next/image";

const AVATAR_COLORS = [
    "bg-red-500",
    "bg-orange-500",
    "bg-amber-500",
    "bg-green-500",
    "bg-emerald-500",
    "bg-sky-500",
    "bg-blue-500",
    "bg-indigo-500",
    "bg-purple-500",
    "bg-pink-500",
];

function ContactListAvatar(props: {signedUrl: string | null, alt: string}) {

    const {signedUrl, alt} = props;
    const getColorFromString = async (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        const index = Math.abs(hash) % AVATAR_COLORS.length;
        return AVATAR_COLORS[index];
    };

    const bgColorClass = getColorFromString(alt);

    return <>
        {signedUrl ? (
            <NextImage
                src={signedUrl}
                alt={alt}
                unoptimized
                width={50}
                height={50}
                className="rounded-full h-8 w-8 object-cover object-top-left"
            />
        ) : (
            <div className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold text-white ${bgColorClass}`}>
                {alt?.[0] ?? "?"}
            </div>
        )}
    </>
}

export default ContactListAvatar;
