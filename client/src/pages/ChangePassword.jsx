import React from 'react';
import { useNavigate } from 'react-router-dom';
import AuthShell from '../components/auth/AuthShell';
import PasswordForm from '../components/profile/PasswordForm';
import { useAuth } from '../context/AuthContext';
import { roleHome } from '../utils/roleHome';

export default function ChangePassword() {
  const navigate = useNavigate();
  const { setUser, logout } = useAuth();

  const handleSuccess = (updatedUser) => {
    setUser(updatedUser);
    navigate(roleHome(updatedUser), { replace: true });
  };

  return (
    <AuthShell
      eyebrow="Security update"
      title="Change your password"
      footer={(
        <span>
          Signed in with a temporary password.{' '}
          <button
            type="button"
            onClick={logout}
            className="font-semibold text-primary hover:underline cursor-pointer"
          >
            Sign out
          </button>
        </span>
      )}
    >
      <p className="mb-4 text-sm text-secondary">
        Your administrator set a temporary password for your account. Please choose a new password to continue.
      </p>
      <PasswordForm bare onSuccess={handleSuccess} />
    </AuthShell>
  );
}
