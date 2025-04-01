import React, { useState } from "react";
import api from "../../api";
import Swal from "sweetalert2";
import BannerTitle from "../../components/BannerTitle.jsx";
import ButtonSpinner from "../../components/ButtonSpinner.jsx";

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
            const response = await api.post("/api/stock/create/project/", {
                project_title: formData.projectTitle,
                project_description: formData.projectDescription,
                project_responsible_mail:formData.responsibleMail
            });

            if (response.status === 201) {
                // Send email notification
                const mailData = {
                    email: formData.responsibleMail,
                    subject: "Project Opening",
                    message: `Project opened successfully. Your project ID is ${response.data.project_id}`,
                };
                await api.post("/api/mail/send-email/", mailData);

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
            <form className="max-w-md mx-auto space-y-6" onSubmit={handleSubmit}>
                {/* Project Title Field */}
                <div className="mb-2">
                    <label htmlFor="projectTitle" className="block text-sm font-medium text-gray-900 dark:text-white">
                        Project Title
                    </label>
                    <input
                        type="text"
                        id="projectTitle"
                        value={formData.projectTitle}
                        onChange={handleInputChange}
                        className={`bg-gray-50 border ${
                            errors.projectTitle ? "border-red-500" : "border-gray-300"
                        } text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500`}
                    />
                    {errors.projectTitle && (
                        <p className="text-red-500 text-sm mt-1">{errors.projectTitle}</p>
                    )}
                </div>

                {/* Project Description Field */}
                <div className="mb-2">
                    <label htmlFor="projectDescription" className="block text-sm font-medium text-gray-900 dark:text-white">
                        Project Short Description
                    </label>
                    <input
                        type="text"
                        id="projectDescription"
                        value={formData.projectDescription}
                        onChange={handleInputChange}
                        className={`bg-gray-50 border ${
                            errors.projectDescription ? "border-red-500" : "border-gray-300"
                        } text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500`}
                    />
                    {errors.projectDescription && (
                        <p className="text-red-500 text-sm mt-1">{errors.projectDescription}</p>
                    )}
                </div>

                {/* Responsible Mail Field */}
                <div className="mb-2">
                    <label htmlFor="responsibleMail" className="block text-sm font-medium text-gray-900 dark:text-white">
                        Responsible Mail
                    </label>
                    <input
                        type="email"
                        id="responsibleMail"
                        value={formData.responsibleMail}
                        onChange={handleInputChange}
                        className={`bg-gray-50 border ${
                            errors.responsibleMail ? "border-red-500" : "border-gray-300"
                        } text-gray-900 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block w-full p-2.5 dark:bg-gray-700 dark:border-gray-600 dark:placeholder-gray-400 dark:text-white dark:focus:ring-blue-500 dark:focus:border-blue-500`}
                    />
                    {errors.responsibleMail && (
                        <p className="text-red-500 text-sm mt-1">{errors.responsibleMail}</p>
                    )}
                </div>

                {/* Submit Button */}
                <div className="flex justify-center">
                    <button
                        type="submit"
                        className="w-full bg-blue-700 text-white hover:bg-blue-800 focus:ring-4 focus:outline-none focus:ring-blue-300 font-medium rounded-lg text-sm px-4 py-2 dark:bg-blue-600 dark:hover:bg-blue-700 dark:focus:ring-blue-800"
                        disabled={loading}
                    >
                        {loading ? <ButtonSpinner /> : "Submit"}
                    </button>
                </div>
            </form>
        </>
    );
};

export default CreateProjects;