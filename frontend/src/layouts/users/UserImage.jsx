const UserImage = ({ image_url, name, sex }) => {
    // Determine the default image based on the 'sex' prop
    const defaultImage =
      sex === 'M'
        ? 'https://cdn-icons-png.flaticon.com/512/0/93.png'
        : 'https://e7.pngegg.com/pngimages/439/19/png-clipart-avatar-user-profile-icon-women-wear-frock-face-holidays.png';
  
    return (
      <div className="flex-shrink-0 mb-4 sm:mb-0">
        {/* Image rendering logic */}
        <img
          className="w-20 h-20 rounded-full object-cover border-2 border-gray-200 dark:border-gray-700"
          src={image_url || defaultImage} // Use image_url or fallback to defaultImage
          alt={`${name}'s avatar`} // Dynamically set alt text using the name
        />
      </div>
    );
  };
  
  export default UserImage;
  