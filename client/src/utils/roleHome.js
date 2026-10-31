export function roleHome(user) {
  if (!user) return '/login';
  if (user.role === 'admin') return '/admin';
  if (user.role === 'manager') return '/manager';
  if (user.role === 'farmer') {
    if (!user.profileComplete) return '/complete-profile';
    if (!user.devices || user.devices.length === 0) return '/devices';
    return '/';
  }
  return '/login';
}

