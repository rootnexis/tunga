import React, { useEffect, useState } from 'react';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { PageSeo } from '@/components/shared/PageSeo';
import { EmptyState } from '@/components/shared/EmptyState';
import { formatRelativeTime } from '@/utils/formatters';
import type { Notification } from '@/types';

export default function AccountNotificationsPage() {
  const { user } = useAuth();
  const [notifs, setNotifs] = useState<Notification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    setNotifs((data as Notification[]) ?? []);
    setIsLoading(false);
  };

  useEffect(() => { load(); }, [user]);

  const markRead = async (id: string) => {
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('id', id);
    setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const markAllRead = async () => {
    if (!user) return;
    await supabase.from('notifications').update({ is_read: true, read_at: new Date().toISOString() })
      .eq('user_id', user.id).eq('is_read', false);
    setNotifs(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const unreadCount = notifs.filter(n => !n.is_read).length;

  return (
    <>
      <PageSeo title="Notifications" />
      <div className="account-card">
        <div className="account-card-header">
          <h1 className="account-card-title">
            Notifications
            {unreadCount > 0 && (
              <span className="badge badge-primary" style={{ marginLeft: 'var(--space-2)' }}>{unreadCount}</span>
            )}
          </h1>
          {unreadCount > 0 && (
            <button className="btn btn-ghost btn-sm" onClick={markAllRead}>
              <CheckCheck size={14} /> Mark all read
            </button>
          )}
        </div>

        {isLoading ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--color-text-tertiary)' }}>Loading…</div>
        ) : notifs.length === 0 ? (
          <div style={{ padding: 'var(--space-8)' }}>
            <EmptyState icon={Bell} title="No notifications" description="You're all caught up! We'll notify you about orders, offers, and more." />
          </div>
        ) : (
          <div>
            {notifs.map(notif => (
              <div
                key={notif.id}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: 'var(--space-4)',
                  padding: 'var(--space-4) var(--space-5)',
                  borderBottom: '1px solid var(--color-border)',
                  background: notif.is_read ? 'transparent' : 'var(--indigo-50)',
                  cursor: notif.is_read ? 'default' : 'pointer',
                  transition: 'background var(--transition-fast)',
                }}
                onClick={() => !notif.is_read && markRead(notif.id)}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                  background: notif.is_read ? 'var(--slate-100)' : 'var(--indigo-100)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: notif.is_read ? 'var(--slate-400)' : 'var(--indigo-600)',
                }}>
                  <Bell size={16} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 'var(--text-sm)', fontWeight: 'var(--font-semibold)', marginBottom: 2 }}>{notif.title}</p>
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)', lineHeight: 'var(--leading-relaxed)' }}>{notif.body}</p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-tertiary)', marginTop: 'var(--space-1)' }}>
                    {formatRelativeTime(notif.created_at)}
                  </p>
                </div>
                {!notif.is_read && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--indigo-500)', flexShrink: 0, marginTop: 6 }} />
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
