// utils/checkProjectStatus.js
import API from "@/api/axios"; 
import Swal from 'sweetalert2';

export const checkProjectStatus = async (projectId) => {
  try {
    const response = await API.get(`/api/stock/project/status/${projectId}/`);
    
    if (response.data.project_active_status === false) {
      await Swal.fire({
        icon: 'info',
        title: 'Project Closed',
        text: 'The project is already closed',
        confirmButtonText: 'OK'
      });
      return false;
    }
    return true;
  } catch (error) {
    console.error('Error checking project status:', error);
    await Swal.fire({
      icon: 'error',
      title: 'Error',
      text: error.response?.data?.message || 'Failed to check project status',
      confirmButtonText: 'OK'
    });
    return false;
  }
};