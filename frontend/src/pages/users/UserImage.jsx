import { useState } from 'react';
import { UserRound } from 'lucide-react';

export default function UserImage({ src, loading }) {
    const [failedUrl, setFailedUrl] = useState(null);

    if (src && src !== failedUrl) {
        return (
            <img
                src={src}
                alt=""
                loading={loading}
                className="size-14 shrink-0 rounded-full object-cover ring-1 ring-slate-200 sm:size-16"
                onError={() => setFailedUrl(src)}
            />
        );
    }

    return (
        <span aria-hidden="true" className="grid size-14 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-700 ring-1 ring-blue-100 sm:size-16">
            <UserRound className="size-7" />
        </span>
    );
}
