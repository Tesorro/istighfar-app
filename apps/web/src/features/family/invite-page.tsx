import { useEffect } from 'react';
import { Link, useParams } from 'react-router';
import { Button } from '@/components/ui/button';
import { ScreenLoader } from '@/components/screen-loader';
import { saveInviteToken } from '@/lib/invite';
import { useAuth } from '@/features/auth/auth-context';
import { AuthLayout } from '@/features/auth/auth-layout';

export function InvitePage() {
  const { token = '' } = useParams();
  const { user, ready } = useAuth();
  useEffect(() => {
    if (token) {
      saveInviteToken(token);
    }
  }, [token]);

  if (!ready) {
    return <ScreenLoader />;
  }

  return (
    <AuthLayout title="Приглашение в семью" text="Два человека. Одна цель. Приглашение одноразовое и действует ограниченное время.">
      <div className="space-y-3">
        {user?.familyId ? (
          <p className="text-sm text-muted">Вы уже состоите в семейной группе. Новое приглашение не нужно.</p>
        ) : null}
        {user && !user.familyId ? (
          <Button asChild className="w-full">
            <Link to="/setup">Присоединиться</Link>
          </Button>
        ) : null}
        {!user ? (
          <>
            <Button asChild className="w-full">
              <Link to="/register">Создать учётную запись</Link>
            </Button>
            <Button asChild variant="quiet" className="w-full">
              <Link to="/login">У меня уже есть вход</Link>
            </Button>
          </>
        ) : null}
      </div>
    </AuthLayout>
  );
}
