import React, { useState } from "react";
import API from "@/api/axios";
import Swal from "sweetalert2";
import BannerTitle from "../../components/BannerTitle.jsx";
import ButtonSpinner from "../../components/ButtonSpinner.jsx";
import { Field } from "@/components/ui/field";
import { PageIntro } from "@/components/ui/page-intro";
import { SurfaceCard } from "@/components/ui/surface-card";

const CreateProjects = () => {
    // State for form fields
    const [formData, setFormData] = useState({
        projectTitle: "",
        projectDescription: "",
        responsibleMail: "",
    });

    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    // Handle input change
    const handleInputChange = (e) => {
        const { id, value } = e.target;
        setFormData((prevData) => ({
            ...prevData,
            [id]: value,
        }));
    };

    // Validate form fields
    const validateForm = () => {
        const newErrors = {};

        if (!formData.projectTitle.trim()) {
            newErrors.projectTitle = "Project Title is required";
        }

        if (!formData.projectDescription.trim()) {
            newErrors.projectDescription = "Project Description is required";
        }

        if (!formData.responsibleMail.trim()) {
            newErrors.responsibleMail = "Responsible Mail is required";
        } else if (!/\S+@\S+\.\S+/.test(formData.responsibleMail)) {
            newErrors.responsibleMail = "Responsible Mail is not valid";
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    // Handle form submission
    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) {
            return;
        }

        setLoading(true);

        try {
            // Create project
            const response = await API.post("/api/stock/create/project/", {
                project_title: formData.projectTitle,
                project_description: formData.projectDescription,
                project_responsible_mail:formData.responsibleMail
            });

            if (response.status === 201) {
                // Send email notification
                // const mailData = {
                //     email: formData.responsibleMail,
                //     subject: "Project Opening",
                //     message: `Project opened successfully. Your project ID is ${response.data.project_id}`,
                // };
                // await API.post("/api/mail/send-email/", mailData);

                // Show success message
                Swal.fire({
                    icon: "success",
                    title: "Success!",
                    text: "Project created successfully!",
                });

                // Reset form fields
                setFormData({
                    projectTitle: "",
                    projectDescription: "",
                    responsibleMail: "",
                });
            } else {
                throw new Error("Something went wrong!");
            }
        } catch (error) {
            Swal.fire({
                icon: "error",
                title: "Oops...",
                text: error.response?.data?.message || "Something went wrong!",
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <BannerTitle title="Create Project" />
            <SurfaceCard className="mx-auto max-w-2xl">
                <PageIntro
                    eyebrow="Projects"
                    title="New Project"
                    description="Create a project with a clear title, description, and responsible contact."
                />
            <form className="space-y-6" onSubmit={handleSubmit}>
                {/* Project Title Field */}
                <Field htmlFor="projectTitle" label="Project Title" error={errors.projectTitle}>
                    <input
                        type="text"
                        id="projectTitle"
                        value={formData.projectTitle}
                        onChange={handleInputChange}
                        className={`field-input ${errors.projectTitle ? "border-red-500" : ""}`}
                    />
                </Field>

                {/* Project Description Field */}
                <Field htmlFor="projectDescription" label="Project Short Description" error={errors.projectDescription}>
                    <input
                        type="text"
                        id="projectDescription"
                        value={formData.projectDescription}
                        onChange={handleInputChange}
                        className={`field-input ${errors.projectDescription ? "border-red-500" : ""}`}
                    />
                </Field>

                {/* Responsible Mail Field */}
                <Field htmlFor="responsibleMail" label="Responsible Mail" error={errors.responsibleMail}>
                    <input
                        type="email"
                        id="responsibleMail"
                        value={formData.responsibleMail}
                        onChange={handleInputChange}
                        className={`field-input ${errors.responsibleMail ? "border-red-500" : ""}`}
                    />
                </Field>

                {/* Submit Button */}
                <div className="flex justify-center">
                    <button
                        type="submit"
                        className="primary-button"
                        disabled={loading}
                    >
                        {loading ? <ButtonSpinner /> : "Submit"}
                    </button>
                </div>
            </form>
            </SurfaceCard>
        </>
    );
};

export default CreateProjects;
