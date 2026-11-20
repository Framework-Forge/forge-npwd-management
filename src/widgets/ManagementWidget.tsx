import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ManagementData } from '../types';
import { fetchNui } from '../utils/fetchNui';

interface WidgetProps { width: number; height: number }
interface Response { status: 'ok' | 'error'; data?: ManagementData }
const money = (value: number) => value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

export const ManagementWidget: React.FC<WidgetProps> = ({ width, height }) => {
  const [data, setData] = useState<ManagementData | null>(null);
  const [loaded, setLoaded] = useState(false);
  const refresh = useCallback(async () => {
    try {
      const response = await fetchNui<Response>('getManagementData');
      if (response.status === 'ok' && response.data) setData(response.data);
    } finally { setLoaded(true); }
  }, []);

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(refresh, 45000);
    const onMessage = (event: MessageEvent) => {
      if (event.data?.action === 'refreshManagement' || event.data?.method === 'refreshManagement') void refresh();
    };
    window.addEventListener('message', onMessage);
    return () => { window.clearInterval(timer); window.removeEventListener('message', onMessage); };
  }, [refresh]);

  const pending = useMemo(() => data?.candidates.filter((candidate) => candidate.status === 'pending') || [], [data]);
  const registers = useMemo(() => (data?.registers || []).reduce((sum, register) => sum + Number(register.balance || 0), 0), [data]);
  const organization = data?.organization;
  const compact = width === 2 && height === 1;

  if (loaded && (!data || !data.authorized)) return <div style={{ display: 'flex', width: '100%', height: '100%', boxSizing: 'border-box', alignItems: 'center', justifyContent: 'center', borderRadius: 16, padding: 12, textAlign: 'center', color: '#d1fae5', background: 'linear-gradient(145deg,#064e3b,#022c22)', border: '1px solid rgba(52,211,153,.25)', fontSize: 11, fontWeight: 650 }}>Sem permissão para visualizar a Gestão.</div>;

  return (
    <div style={{ width: '100%', height: '100%', boxSizing: 'border-box', overflow: 'hidden', borderRadius: 16, padding: compact ? '9px 11px' : '10px 14px', color: '#ecfdf5', background: 'linear-gradient(145deg,#059669,#064e3b)', border: '1px solid rgba(167,243,208,.25)', boxShadow: '0 10px 24px rgba(0,0,0,.28)', fontFamily: 'inherit' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}><span style={{ fontSize: 10, fontWeight: 850, letterSpacing: '.07em' }}>GESTÃO</span><span style={{ fontSize: 9, opacity: .7 }}>{organization?.badge || 'FORGE'}</span></div>
      <div style={{ marginTop: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: compact ? 14 : 17, fontWeight: 800 }}>{organization?.label || (loaded ? 'Organização' : 'Atualizando…')}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 9, opacity: .85 }}><span>{organization?.playerGradeName || '—'}</span><span><b>{organization?.onlineMembers || 0}</b>/{organization?.totalMembers || 0} online</span></div>
      {!compact && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 5, marginTop: 8 }}>
        {[[money(organization?.balance || 0),'Saldo'],[money(registers),'Cofres'],[String(pending.length),'Candidaturas']].map(([value,label]) => <div key={label} style={{ borderRadius: 8, padding: '6px 4px', textAlign: 'center', background: 'rgba(0,0,0,.13)' }}><div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 10, fontWeight: 800 }}>{value}</div><div style={{ marginTop: 3, fontSize: 7, opacity: .65 }}>{label}</div></div>)}
      </div>}
      {height >= 2 && <div style={{ marginTop: 8, paddingTop: 6, borderTop: '1px solid rgba(255,255,255,.15)' }}>
        <div style={{ fontSize: 8, fontWeight: 700, opacity: .6 }}>ATIVIDADE RECENTE</div>
        {(data?.transactions || []).slice(0, 2).map((transaction) => <div key={transaction.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 5, fontSize: 9 }}><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{transaction.title}</span><b style={{ flexShrink: 0, color: transaction.isDeposit ? '#a7f3d0' : '#fecaca' }}>{transaction.isDeposit ? '+' : '-'}{money(Math.abs(transaction.amount))}</b></div>)}
        {!data?.transactions.length && <div style={{ marginTop: 5, fontSize: 9, opacity: .6 }}>Nenhuma movimentação recente.</div>}
      </div>}
    </div>
  );
};
