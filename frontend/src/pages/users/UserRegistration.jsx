import { useState } from "react";
import { IdCard, KeyRound, UserPlus, UserRound } from "lucide-react";
import Swal from "sweetalert2";
import API from "@/api/axios";
import { getApiError } from "@/api/errors";

function RegistrationSection({ icon, title, children }) {
    return (
        <fieldset className="min-w-0 rounded-2xl border border-slate-200 px-4 pb-5 sm:px-6">
            <legend className="px-2 text-sm font-semibold text-slate-800">
                <span className="inline-flex items-center gap-2">
                    {icon}
                    {title}
                </span>
            </legend>
            <div className="mt-2 grid gap-4 sm:grid-cols-2">{children}</div>
        </fieldset>
    );
}

function RegistrationField({ name, label, error, hint, children, required, ...inputProps }) {
    const attributes = {
        id: name,
        name,
        required,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": [hint && `${name}-hint`, error && `${name}-error`].filter(Boolean).join(" ") || undefined,
    };

    return (
        <div className="min-w-0">
            <label className="field-label" htmlFor={name}>
                {label}{required && <span className="text-red-600"> *</span>}
            </label>
            {children ? children(attributes) : <input className="field-input" {...inputProps} {...attributes} />}
            {hint && <p id={`${name}-hint`} className="mt-1 text-xs text-slate-500">{hint}</p>}
            {error && <p id={`${name}-error`} className="field-error">{error}</p>}
        </div>
    );
}

const fieldNames = ["email", "password", "name", "phone", "sex", "dob", "profile_image", "nid", "nid_scan_copy"];
const secondaryButton = "rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50";

export default function UserRegistration() {
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});
    const [password, setPassword] = useState("");
    const [profilePreview, setProfilePreview] = useState("");

    function clearFormFeedback() {
        setPassword("");
        setProfilePreview("");
        setErrors({});
    }

    function generatePassword() {
        const characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
        const values = crypto.getRandomValues(new Uint32Array(16));
        setPassword(Array.from(values, (value) => characters[value % characters.length]).join(""));
    }

    function previewProfilePhoto(event) {
        const file = event.target.files[0];
        setProfilePreview("");
        if (!file) return;

        const input = event.target;
        const reader = new FileReader();
        reader.onload = () => {
            if (input.files[0] === file) setProfilePreview(reader.result);
        };
        reader.readAsDataURL(file);
    }

    async function handleSubmit(event) {
        event.preventDefault();
        const form = event.currentTarget;
        const data = new FormData(form);

        const validationErrors = {};
        for (const name of fieldNames) {
            const input = form.elements.namedItem(name);
            if (!input.validity.valid) validationErrors[name] = input.validationMessage;
        }
        if (data.get("nid_scan_copy").size > 2 * 1024 * 1024) {
            validationErrors.nid_scan_copy = "The scan must be 2 MB or smaller.";
        }
        const [firstInvalidField] = Object.keys(validationErrors);
        if (firstInvalidField) {
            setErrors(validationErrors);
            await Swal.fire({
                icon: "error",
                title: "Check registration details",
                text: validationErrors[firstInvalidField],
                returnFocus: false,
            });
            form.elements.namedItem(firstInvalidField).focus();
            return;
        }

        for (const field of ["dob", "profile_image", "nid_scan_copy"]) {
            const value = data.get(field);
            if (!value || (value instanceof File && !value.name)) data.delete(field);
        }

        setLoading(true);
        setErrors({});
        try {
            await API.post("/api/user-register/", data);
            form.reset();
            Swal.fire({ icon: "success", title: "User created", text: "The user account was created successfully." });
        } catch (error) {
            const response = error.response?.status === 400 ? error.response.data : null;
            const fieldErrors = {};
            for (const name of fieldNames) {
                const message = response?.[name];
                if (Array.isArray(message)) fieldErrors[name] = message.join(" ");
                else if (typeof message === "string") fieldErrors[name] = message;
            }
            setErrors(fieldErrors);
            Swal.fire({
                icon: "error",
                title: "Registration failed",
                text: getApiError(error, "Could not create the user. Please try again."),
            });
        } finally {
            setLoading(false);
        }
    }

    return (
        <section className="mx-auto w-full max-w-5xl px-3 py-5 sm:px-6 sm:py-8">
            <div className="page-card !p-4 sm:!p-7">
                <header className="mb-5 flex items-center gap-3">
                    <div className="rounded-2xl bg-blue-50 p-3 text-blue-700">
                        <UserPlus aria-hidden="true" className="size-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Register a user</h1>
                        <p className="section-copy">Fields marked with * are required.</p>
                    </div>
                </header>

                <form noValidate onSubmit={handleSubmit} onReset={clearFormFeedback}>
                    <fieldset disabled={loading} className="min-w-0 space-y-5">
                        <RegistrationSection icon={<KeyRound aria-hidden="true" className="size-4 text-blue-600" />} title="Account details">
                            <RegistrationField name="email" label="Email address" type="email" autoComplete="off" required error={errors.email} />
                            <RegistrationField name="password" label="Initial password" required error={errors.password}>
                                {(attributes) => (
                                    <div className="flex gap-2">
                                        <input className="field-input min-w-0" {...attributes} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength={8} placeholder="At least 8 characters" />
                                        <button className={secondaryButton} type="button" onClick={generatePassword}>Generate</button>
                                    </div>
                                )}
                            </RegistrationField>
                        </RegistrationSection>

                        <RegistrationSection icon={<UserRound aria-hidden="true" className="size-4 text-blue-600" />} title="Personal details">
                            <RegistrationField name="name" label="Full name" required maxLength={255} error={errors.name} />
                            <RegistrationField name="phone" label="Phone number" type="tel" maxLength={20} error={errors.phone} />
                            <RegistrationField name="dob" label="Date of birth" type="date" error={errors.dob} />
                            <RegistrationField name="sex" label="Sex" error={errors.sex}>
                                {(attributes) => (
                                    <select className="field-select" {...attributes} defaultValue="M">
                                        <option value="M">Male</option>
                                        <option value="F">Female</option>
                                        <option value="O">Other</option>
                                    </select>
                                )}
                            </RegistrationField>
                            <RegistrationField name="profile_image" label="Profile photo" error={errors.profile_image}>
                                {(attributes) => (
                                    <div className="flex items-center gap-3">
                                        {profilePreview && <img src={profilePreview} alt="Profile preview" className="size-10 rounded-full object-cover" />}
                                        <input className="field-input min-w-0" type="file" accept="image/*" onChange={previewProfilePhoto} {...attributes} />
                                    </div>
                                )}
                            </RegistrationField>
                        </RegistrationSection>

                        <RegistrationSection icon={<IdCard aria-hidden="true" className="size-4 text-blue-600" />} title="National ID">
                            <RegistrationField name="nid" label="NID number" inputMode="numeric" pattern="[0-9]{1,17}" maxLength={17} hint="Up to 17 digits." error={errors.nid} />
                            <RegistrationField name="nid_scan_copy" label="NID scan copy" type="file" accept=".pdf,.jpg,.jpeg,.png" hint="PDF, JPG, or PNG up to 2 MB." error={errors.nid_scan_copy} />
                        </RegistrationSection>

                        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
                            <button className={secondaryButton} type="reset">Reset form</button>
                            <button className="primary-button !w-auto" type="submit">
                                {loading ? "Creating user…" : "Create user"}
                            </button>
                        </div>
                    </fieldset>
                </form>
            </div>
        </section>
    );
}
