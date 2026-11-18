import { useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import Swal from 'sweetalert2';
import UserImage from './UserImage';

export default function ProfilePhotoPicker({ src, disabled, form, onSelect }) {
    const [preview, setPreview] = useState(null);
    const photoInput = useRef(null);
    const photoUrl = preview || src;

    function selectPhoto(event) {
        const input = event.currentTarget;
        const [file] = input.files;
        setPreview(null);
        if (!file) return;
        if (file.size > 2 * 1024 * 1024) {
            input.value = '';
            Swal.fire({ icon: 'error', title: 'Photo is too large', text: 'Choose a photo up to 2 MB.' });
            return;
        }

        onSelect?.();
        const reader = new FileReader();
        reader.onload = () => {
            if (input.isConnected && input.files[0] === file) setPreview(reader.result);
        };
        reader.readAsDataURL(file);
    }

    return (
        <>
            <button
                type="button"
                aria-label="Change profile photo"
                title="Change profile photo"
                disabled={disabled}
                onClick={() => photoInput.current.click()}
                className="relative shrink-0 rounded-full hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-blue-600 disabled:opacity-60"
            >
                <UserImage src={photoUrl} />
                <span aria-hidden="true" className="absolute -right-1 -bottom-1 grid size-6 place-items-center rounded-full bg-blue-600 text-white ring-2 ring-white">
                    <Camera className="size-3.5" />
                </span>
            </button>
            <input
                ref={photoInput}
                form={form}
                name="profile_image"
                type="file"
                accept="image/*"
                onChange={selectPhoto}
                disabled={disabled}
                hidden
            />
        </>
    );
}
