import { useState, useEffect, useContext, use } from "react";
import { CalendarIcon, UserIcon, SaveIcon, EditIcon } from "lucide-react";
import { format } from "date-fns";
import API from "@/api/axios";
import { useAuth } from "@/auth/AuthContext";

const UserDetails = () => {
  // Retrieve the base URL from environment variables
  const baseURL = import.meta.env.VITE_API_URL;
  const { userData, setUserData } = useAuth();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showCalendar, setShowCalendar] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    name: "",
    phone: "",
    profile_image: null,
    profile_image_preview: null,
    sex: "M",
    bio: "",
    dob: null,
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      // const response = await API.get('/api/user-profile/');
      // const userData = response.data;

      // Format the data for the form
      setFormData({
        email: userData.email,
        name: userData.name,
        phone: userData.phone || "",
        profile_image: null,
        profile_image_preview: userData.profile_image || null,
        sex: userData.sex || "M",
        bio: userData.bio || "",
        dob: userData.dob ? new Date(userData.dob) : null,
      });
    } catch (error) {
      console.error("Error fetching user profile:", error);
      setErrors({ general: "Failed to load user profile" });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
    // Clear error when field is edited
    if (errors[field]) {
      setErrors({ ...errors, [field]: null });
    }
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({
          ...formData,
          profile_image: file,
          profile_image_preview: reader.result,
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) newErrors.email = "Email is required";
    else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Email is invalid";

    if (!formData.name) newErrors.name = "Name is required";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (validateForm()) {
      setLoading(true);
      setSuccess(false);
      setErrors({});

      try {
        // Prepare form data (including file upload)
        const formDataToSend = new FormData();
        formDataToSend.append("email", formData.email);
        formDataToSend.append("name", formData.name);
        formDataToSend.append("phone", formData.phone || "");
        formDataToSend.append("sex", formData.sex);
        formDataToSend.append("bio", formData.bio || "");

        if (formData.dob) {
          formDataToSend.append("dob", format(formData.dob, "yyyy-MM-dd"));
        }

        if (formData.profile_image) {
          formDataToSend.append("profile_image", formData.profile_image);
        }

        const response = await API.patch('/api/user-profile/', formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });


        setUserData(response.data);
        setSuccess(true);
        setEditing(false);

        // Update the profile image preview if it was changed
        if (formData.profile_image) {
          setFormData(prev => ({
            ...prev,
            profile_image: null, // reset the file object
            profile_image_preview: response.data.profile_image || prev.profile_image_preview
          }));
        }

      } catch (error) {
        console.error("Error updating user:", error);

        if (error.response) {
          // The request was made and the server responded with a status code
          console.error("Response data:", error.response.data);
          console.error("Response status:", error.response.status);

          if (error.response.data) {
            const apiErrors = {};
            // Handle different error response formats
            if (typeof error.response.data === 'object') {
              Object.keys(error.response.data).forEach((key) => {
                apiErrors[key] = Array.isArray(error.response.data[key])
                  ? error.response.data[key].join(" ")
                  : error.response.data[key];
              });
            } else if (typeof error.response.data === 'string') {
              apiErrors.general = error.response.data;
            }
            setErrors(apiErrors);
          }
        } else if (error.request) {
          // The request was made but no response was received
          setErrors({ general: "No response from server. Please try again." });
        } else {
          // Something happened in setting up the request
          setErrors({ general: error.message || "Update failed. Please try again." });
        }
      } finally {
        setLoading(false);
      }
    }
  };

  const toggleEditing = () => {
    setEditing(!editing);
    if (!editing) {
      setSuccess(false);
      setErrors({});
    }
  };

  if (loading && !editing) {
    return (
      <div className="bg-gray-100 dark:bg-gray-900 min-h-screen p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="bg-gray-100 dark:bg-gray-900 min-h-screen p-8">
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow overflow-hidden sm:rounded-lg">
          {/* Header */}
          <div className="px-4 py-5 border-b border-gray-200 sm:px-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg leading-6 font-medium text-gray-900">User Profile</h3>
                <p className="mt-1 max-w-2xl text-sm text-gray-500">View and manage your profile information</p>
              </div>
              <div className="flex items-center space-x-3">
                {success && (
                  <div className="bg-green-50 text-green-800 px-4 py-2 rounded-md text-sm flex items-center">
                    <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                      <path
                        fillRule="evenodd"
                        d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                        clipRule="evenodd"
                      />
                    </svg>
                    Profile updated successfully
                  </div>
                )}
                <button
                  type="button"
                  onClick={toggleEditing}
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white ${editing ? 'bg-gray-600 hover:bg-gray-700' : 'bg-blue-600 hover:bg-blue-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
                >
                  {editing ? 'Cancel' : (
                    <>
                      <EditIcon className="mr-2 h-4 w-4" />
                      Edit Profile
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-4 py-5 sm:p-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              {/* Profile Image */}
              <div className="sm:col-span-6">
                <label className="block text-sm font-medium text-gray-700">Profile Picture</label>
                <div className="mt-1 flex items-center space-x-5">
                  <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-300">
                    {formData.profile_image_preview ? (
                      <img
                        src={formData.profile_image_preview}
                        alt="Profile preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <UserIcon className="h-12 w-12 text-gray-400" />
                    )}
                  </div>
                  {editing && (
                    <div>
                      <label
                        htmlFor="profile_image"
                        className="cursor-pointer px-3 py-2 border border-gray-300 rounded-md bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        Change Photo
                        <input
                          id="profile_image"
                          type="file"
                          accept="image/*"
                          onChange={handleImageChange}
                          className="sr-only"
                        />
                      </label>
                      <p className="mt-1 text-xs text-gray-500">JPG, PNG, or GIF up to 10MB</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Account Information Section */}
              <div className="sm:col-span-6">
                <h4 className="text-md font-medium text-gray-900 mb-3 pb-2 border-b border-gray-200">
                  Account Information
                </h4>
              </div>

              {/* Email */}
              <div className="sm:col-span-4">
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  {editing ? (
                    <input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border ${errors.email ? "border-red-500" : "border-gray-300"
                        } rounded-md p-2`}
                      placeholder="user@example.com"
                    />
                  ) : (
                    <div className="p-2 text-gray-900">{formData.email}</div>
                  )}
                  {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
                </div>
              </div>

              {/* Personal Information Section */}
              <div className="sm:col-span-6">
                <h4 className="text-md font-medium text-gray-900 mb-3 pb-2 border-b border-gray-200">
                  Personal Information
                </h4>
              </div>

              {/* Name */}
              <div className="sm:col-span-3">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <div className="mt-1">
                  {editing ? (
                    <input
                      id="name"
                      type="text"
                      value={formData.name}
                      onChange={(e) => handleChange("name", e.target.value)}
                      className={`shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border ${errors.name ? "border-red-500" : "border-gray-300"
                        } rounded-md p-2`}
                      placeholder="John Doe"
                    />
                  ) : (
                    <div className="p-2 text-gray-900">{formData.name}</div>
                  )}
                  {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
                </div>
              </div>

              {/* Phone */}
              <div className="sm:col-span-3">
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                  Phone Number
                </label>
                <div className="mt-1">
                  {editing ? (
                    <input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-gray-300 rounded-md p-2"
                      placeholder="+1 (555) 123-4567"
                    />
                  ) : (
                    <div className="p-2 text-gray-900">{formData.phone || "Not provided"}</div>
                  )}
                </div>
              </div>

              {/* Sex */}
              <div className="sm:col-span-2">
                <label htmlFor="sex" className="block text-sm font-medium text-gray-700">
                  Sex
                </label>
                <div className="mt-1">
                  {editing ? (
                    <div className="relative">
                      <select
                        id="sex"
                        value={formData.sex}
                        onChange={(e) => handleChange("sex", e.target.value)}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-gray-300 rounded-md p-2 pr-8 appearance-none"
                      >
                        <option value="M">Male</option>
                        <option value="F">Female</option>
                        <option value="O">Other</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                        <svg
                          className="h-5 w-5 text-gray-400"
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                          />
                        </svg>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 text-gray-900">
                      {formData.sex === 'M' ? 'Male' : formData.sex === 'F' ? 'Female' : 'Other'}
                    </div>
                  )}
                </div>
              </div>

              {/* Date of Birth */}
              <div className="sm:col-span-2">
                <label htmlFor="dob" className="block text-sm font-medium text-gray-700">
                  Date of Birth
                </label>
                <div className="mt-1 relative">
                  {editing ? (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowCalendar(!showCalendar)}
                        className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-gray-300 rounded-md p-2 bg-white text-left"
                      >
                        <div className="flex items-center">
                          <CalendarIcon className="mr-2 h-4 w-4 text-gray-500" />
                          {formData.dob ? format(formData.dob, "PPP") : <span className="text-gray-500">Select date</span>}
                        </div>
                      </button>

                      {showCalendar && (
                        <div className="absolute z-10 mt-1 w-full bg-white shadow-lg rounded-md border border-gray-200 p-2">
                          <input
                            type="date"
                            value={formData.dob ? format(formData.dob, "yyyy-MM-dd") : ""}
                            onChange={(e) => {
                              handleChange("dob", new Date(e.target.value))
                              setShowCalendar(false)
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-2 text-gray-900">
                      {formData.dob ? format(formData.dob, "PPP") : "Not provided"}
                    </div>
                  )}
                </div>
              </div>

              {/* Bio */}
              <div className="sm:col-span-6">
                <label htmlFor="bio" className="block text-sm font-medium text-gray-700">
                  Bio
                </label>
                <div className="mt-1">
                  {editing ? (
                    <textarea
                      id="bio"
                      value={formData.bio}
                      onChange={(e) => handleChange("bio", e.target.value)}
                      rows={3}
                      className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border border-gray-300 rounded-md p-2"
                      placeholder="Brief description about yourself"
                    />
                  ) : (
                    <div className="p-2 text-gray-900 whitespace-pre-line">
                      {formData.bio || "Not provided"}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Form Actions - Only show when editing */}
            {editing && (
              <div className="mt-8 border-t border-gray-200 pt-5">
                <div className="flex justify-end">
                  {/* <button
                    type="button"
                    onClick={toggleEditing}
                    className="bg-white py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancel
                  </button> */}
                  <button
                    type="submit"
                    disabled={loading}
                    className={`ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${loading ? "opacity-70 cursor-not-allowed" : ""
                      }`}
                  >
                    {loading ? (
                      <>
                        <svg
                          className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                          xmlns="http://www.w3.org/2000/svg"
                          fill="none"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          ></circle>
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                        Saving...
                      </>
                    ) : (
                      <>
                        <SaveIcon className="mr-2 -ml-1 h-4 w-4" />
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default UserDetails;