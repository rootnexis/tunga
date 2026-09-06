import React, { useEffect, useState, useCallback } from 'react';
import { Search } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/contexts/ToastContext';
import { PageSeo } from '@/components/shared/PageSeo';
import { Spinner } from '@/components/shared/Spinner';
import { Pagination } from '@/components/shared/Pagination';
import { formatDate } from '@/utils/formatters';
import type { Profile, UserRole } from '@/types';

const PAGE_SIZE = 20;
const ROLES: UserRole[] = ['customer', 'staff', 'manager', 'admin'];

const ROLE_COLORS: Record<UserRole, string> = {
  customer:    'badge-neutral',
  staff:       'badge-info',
  manager:     'badge-primary',
  admin:       'badge-violet',
  super_admin: 'badge-danger',
};

export default function AdminCustomersPage() {
  const { success } = useToast();
  const [customers, setCustomers] = useState<Profile[]>([]);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [search, setSearch]       = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async () => {
    setIsLoading(true);
    const from = (page - 1) * PAGE_SIZE;
    let q = supabase
      .from('profiles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, from + PAGE_SIZE - 1);
    if (search) q = q.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%`);
    const { data, count } = await q;
    setCustomers((data as Profile[]) ?? []);
    setTotal(count ?? 0);
    setIsLoading(false);
  }, [page, search]);

  useEffect(() => { load(); }, [load]);

  const updateRole = async (profile: Profile, role: UserRole) => {
    await supabase.from('profiles').update({ role }).eq('id', profile.id);
    success('Role updated', `${profile.first_name} is now ${role}`);
    load();
  };

  return (
    <>
      <PageSeo title="Customers — Admin" />
      <div className="admin-page-header">
        <div>
          <h1 className="admin-page-title">Customers</h1>
          <p className="admin-page-desc">{total.toLocaleString()} total users</p>
        </div>
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="admin-table-toolbar">
          <div className="input-group" style={{ width: 280 }}>
            <Search size={14} className="input-icon-left" />
            <input type="search" className="input input-sm" placeholder="Search by name…" value={search}
              onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ paddingLeft: 'var(--space-9)' }} />
          </div>
        </div>

        {isLoading ? (
          <div style={{ padding: 'var(--space-12)' }}><Spinner fullPage /></div>
        ) : (
          <>
            <div className="table-wrapper" style={{ border: 'none', borderRadius: 0 }}>
              <table className="table">
                <thead><tr><th>User</th><th>Role</th><th>Joined</th><th>Active</th><th>Change Role</th></tr></thead>
                <tbody>
                  {customers.map(c => (
                    <tr key={c.id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                          <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--color-primary)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--text-xs)', fontWeight: 'var(--font-bold)', flexShrink: 0 }}>
                            {(c.first_name?.[0] ?? '?').toUpperCase()}
                          </div>
                          <div>
                            <p style={{ fontWeight: 'var(--font-medium)', fontSize: 'var(--text-sm)' }}>
                              {c.first_name} {c.last_name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td><span className={`badge ${ROLE_COLORS[c.role]}`}>{c.role}</span></td>
                      <td style={{ color: 'var(--color-text-secondary)' }}>{formatDate(c.created_at)}</td>
                      <td>
                        <span className={`badge ${c.is_active ? 'badge-success' : 'badge-danger'}`}>
                          {c.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <select
                          className="input input-sm"
                          value={c.role}
                          onChange={e => updateRole(c, e.target.value as UserRole)}
                          style={{ width: 120 }}
                          aria-label="Change role"
                        >
                          {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: 'var(--space-4) var(--space-5)' }}>
              <Pagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} onPageChange={setPage} />
            </div>
          </>
        )}
      </div>
    </>
  );
}
