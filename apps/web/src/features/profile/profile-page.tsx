import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useAuth } from '@/features/auth/auth-context';
import { api, ApiError } from '@/lib/api';
import { formatDay } from '@/lib/format';
import type { FamilySummary, InvitationResponse } from '@/types/api';

export function ProfilePage() {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [copied, setCopied] = useState(false);
  const family = useQuery({
    queryKey: ['family'],
    queryFn: () => api<FamilySummary>('/family'),
  });
  const invite = useMutation({
    mutationFn: () => api<InvitationResponse>('/family/invitations', { method: 'POST' }),
  });

  const link = invite.data ? `${window.location.origin}/invite/${invite.data.token}` : null;

  return (
    <div className="px-5 pt-8">
      <p className="eyebrow">Профиль</p>
      <h1 className="mt-2 font-serif text-4xl text-primary-deep">{user?.name}</h1>
      <Card className="mt-6 space-y-3 p-5 text-sm">
        <Row label="Email" value={user?.email ?? ''} />
        <Row label="Семья" value={family.data?.name ?? 'Загрузка…'} />
        <Row label="Часовой пояс" value={family.data?.timezone ?? ''} />
        <Row label="Общая цель" value="1 000 000" />
      </Card>
      {family.data && family.data.memberCount < 2 ? (
        <Card className="mt-4 p-5">
          <h2 className="font-medium">Пригласить супруга</h2>
          <p className="mt-2 text-sm text-muted">Ссылка одноразовая. Её видите только вы, пока не передадите её сами.</p>
          <Button
            className="mt-4 w-full"
            type="button"
            variant="quiet"
            onClick={() => invite.mutate()}
            disabled={invite.isPending}
          >
            {invite.isPending ? 'Готовим ссылку…' : 'Создать приглашение'}
          </Button>
          {invite.isError ? (
            <p role="alert" className="mt-3 text-sm text-danger">
              {invite.error instanceof ApiError ? invite.error.message : 'Не удалось создать приглашение'}
            </p>
          ) : null}
          {link ? (
            <div className="mt-4 space-y-2">
              <p className="break-all text-sm">{link}</p>
              <p className="text-xs text-muted">Действует до {formatDay(invite.data?.expiresAt.slice(0, 10) ?? '')}</p>
              <Button
                type="button"
                variant="ghost"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(link);
                    setCopied(true);
                  } catch {
                    setCopied(false);
                  }
                }}
              >
                {copied ? 'Скопировано' : 'Скопировать'}
              </Button>
            </div>
          ) : null}
        </Card>
      ) : null}
      <Button
        className="mt-6 w-full"
        type="button"
        variant="ghost"
        onClick={async () => {
          await logout();
          queryClient.clear();
        }}
      >
        Выйти
      </Button>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-muted">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}
