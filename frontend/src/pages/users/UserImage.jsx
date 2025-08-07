const UserImage = ({ image_url, name, sex }) => {
  // Determine the default image based on the 'sex' prop
  const defaultImage =
    sex === 'M'
      ? 'https://cdn-icons-png.flaticon.com/512/0/93.png'
      : 'https://e7.pngegg.com/pngimages/439/19/png-clipart-avatar-user-profile-icon-women-wear-frock-face-holidays.png';

  return (

    <img className="w-24 h-24 mb-3 rounded-full shadow-lg"
      src={image_url || defaultImage}
      alt={`${name}'s avatar`}
    />

  );
};

export default UserImage;
