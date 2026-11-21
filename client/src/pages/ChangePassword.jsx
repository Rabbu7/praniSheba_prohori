import React from 'react';
import { useNavigate } from 'react-router-dom';
import AuthShell from '../components/auth/AuthShell';
import PasswordForm from '../components/profile/PasswordForm';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { roleHome } from '../utils/roleHome';

export default function ChangePassword() {
  const navigate = useNavigate();
  const { setUser, logout } = useAuth();
  const { t } = useLanguage();

  const handleSuccess = (updatedUser) => {
    setUser(updatedUser);
    navigate(roleHome(updatedUser), { replace: true });
  };

  return (
    <AuthShell
      eyebrow={t('auth.changePasswordTitle')}
      title={t('auth.changePasswordTitle')}
      footer={(
        <span>
          <button
            type="button"
            onClick={logout}
            className="font-semibold text-primary hover:underline cursor-pointer"
          >
            {t('nav.logout')}
          </button>
        </span>
      )}
    >
      <p className="mb-4 text-sm text-secondary">
        {t('auth.changePasswordSubtitle')}
      </p>
      <PasswordForm bare onSuccess={handleSuccess} />
    </AuthShell>
  );
}
