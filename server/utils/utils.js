function isAdmin(user) {
  return user && user.role && user.role.toLowerCase() === 'admin';
}

module.exports = {
  isAdmin
};
