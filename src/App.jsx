import { useState, useMemo } from 'react';
import {
  LayoutGrid, Users, ArrowLeftRight, Settings, Search, TrendingUp,
  Wallet, Activity, AlertTriangle, UserPlus, Check, X as XIcon,
  Share2, Plus, ScrollText, ShieldCheck,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';

const COLORS = { navy: '#0D1B3E', navyMid: '#16305F', cyan: '#00D2FF', magenta: '#FF4081', gold: '#FBC02D', green: '#28C76F', purple: '#9E57E5' };

const MOCK_USERS = [
  { id: 1, nome: 'Camila Duarte', email: 'camila.duarte@exemplo.com', telefone: '(73) 9 9876-5432', cadastro: '12/07/2026', saldo: 184.5, status: 'ativo', tipo: 'real' },
  { id: 2, nome: 'Rafael Souza', email: 'rafael.souza@exemplo.com', telefone: '(11) 9 8123-4567', cadastro: '10/07/2026', saldo: 0, status: 'ativo', tipo: 'real' },
  { id: 3, nome: 'Beatriz Lima', email: 'bia.lima@exemplo.com', telefone: '(21) 9 7654-3210', cadastro: '09/07/2026', saldo: 62.9, status: 'ativo', tipo: 'real' },
  { id: 4, nome: 'Thiago Nascimento', email: 'thiago.nasc@exemplo.com', telefone: '(85) 9 9345-1122', cadastro: '05/07/2026', saldo: 12.0, status: 'suspenso', tipo: 'real' },
  { id: 5, nome: 'Larissa Freitas', email: 'larissa.f@exemplo.com', telefone: '(31) 9 8877-6655', cadastro: '03/07/2026', saldo: 340.2, status: 'ativo', tipo: 'real' },
  { id: 6, nome: 'Eduardo Prado', email: 'edu.prado@exemplo.com', telefone: '(41) 9 9988-7766', cadastro: '01/07/2026', saldo: 0, status: 'pendente', tipo: 'real' },
];

const INITIAL_TX = [
  { id: 't1', usuario: 'Camila Duarte', tipo: 'Depósito', metodo: 'PIX', valor: 100, data: '29/07/2026 18:42', status: 'concluído' },
  { id: 't2', usuario: 'Larissa Freitas', tipo: 'Saque', metodo: 'PIX', valor: 220, data: '29/07/2026 17:10', status: 'pendente' },
  { id: 't3', usuario: 'Beatriz Lima', tipo: 'Depósito', metodo: 'PIX', valor: 50, data: '29/07/2026 15:55', status: 'concluído' },
  { id: 't4', usuario: 'Thiago Nascimento', tipo: 'Saque', metodo: 'PIX', valor: 30, data: '29/07/2026 14:20', status: 'pendente' },
  { id: 't5', usuario: 'Rafael Souza', tipo: 'Depósito', metodo: 'PIX', valor: 75, data: '28/07/2026 21:03', status: 'falhou' },
  { id: 't6', usuario: 'Eduardo Prado', tipo: 'Saque', metodo: 'PIX', valor: 500, data: '28/07/2026 19:47', status: 'pendente' },
];

const INITIAL_AFFILIATES = [
  { id: 'a1', nome: 'Lucas Ferreira (@lucasjoga)', codigo: 'LUCAS10', comissaoPct: 20, indicados: 34, comissaoAcumulada: 412.8 },
  { id: 'a2', nome: 'Marina Costa (@maricasts)', codigo: 'MARINA5', comissaoPct: 15, indicados: 12, comissaoAcumulada: 96.4 },
];

const MOCK_RTP_SERIES = [
  { dia: '23/07', rtp: 84 }, { dia: '24/07', rtp: 87 }, { dia: '25/07', rtp: 85 },
  { dia: '26/07', rtp: 89 }, { dia: '27/07', rtp: 86 }, { dia: '28/07', rtp: 88 }, { dia: '29/07', rtp: 87 },
];

const NAV = [
  { key: 'overview', label: 'Visão geral', icon: LayoutGrid },
  { key: 'users', label: 'Usuários', icon: Users },
  { key: 'tx', label: 'Transações', icon: ArrowLeftRight },
  { key: 'demo', label: 'Contas demo', icon: UserPlus },
  { key: 'affiliates', label: 'Afiliados', icon: Share2 },
  { key: 'audit', label: 'Auditoria', icon: ScrollText },
  { key: 'config', label: 'Configurações de jogo', icon: Settings },
];

function StatusBadge({ status }) {
  const map = {
    ativo: { bg: 'rgba(40,199,111,.15)', color: COLORS.green, label: 'Ativo' },
    suspenso: { bg: 'rgba(255,64,129,.15)', color: COLORS.magenta, label: 'Suspenso' },
    pendente: { bg: 'rgba(251,192,45,.15)', color: COLORS.gold, label: 'Pendente' },
    concluído: { bg: 'rgba(40,199,111,.15)', color: COLORS.green, label: 'Concluído' },
    falhou: { bg: 'rgba(255,64,129,.15)', color: COLORS.magenta, label: 'Falhou' },
    rejeitado: { bg: 'rgba(255,64,129,.15)', color: COLORS.magenta, label: 'Rejeitado' },
  };
  const s = map[status] || map.pendente;
  return <span style={{ background: s.bg, color: s.color, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>{s.label}</span>;
}

export default function AdminDashboard() {
  const [tab, setTab] = useState('overview');
  const [search, setSearch] = useState('');

  const [tx, setTx] = useState(INITIAL_TX);
  const [demoUsers, setDemoUsers] = useState([]);
  const [demoForm, setDemoForm] = useState({ nome: '', email: '', saldo: 100 });
  const [affiliates, setAffiliates] = useState(INITIAL_AFFILIATES);
  const [affForm, setAffForm] = useState({ nome: '', codigo: '', comissaoPct: 15 });
  const [auditLog, setAuditLog] = useState([
    { id: 'l0', text: 'Painel inicializado (dados de exemplo carregados).', ts: '29/07/2026 09:00' },
  ]);

  const [rtpTarget, setRtpTarget] = useState(88);
  const [maxWinCap, setMaxWinCap] = useState(10);
  const [pointsPerReal, setPointsPerReal] = useState(60);
  const [earlyCashout, setEarlyCashout] = useState(true);
  const [minCashoutPct, setMinCashoutPct] = useState(15);
  const [autoApprove, setAutoApprove] = useState(true);
  const [autoApproveLimit, setAutoApproveLimit] = useState(100);
  const [dailyDepositLimit, setDailyDepositLimit] = useState(500);
  const [selfExclusionOptions, setSelfExclusionOptions] = useState(true);

  function logAction(text) {
    setAuditLog((l) => [{ id: Date.now(), text, ts: 'agora' }, ...l].slice(0, 30));
  }

  function resolveTx(id, approve) {
    const item = tx.find((t) => t.id === id);
    setTx((list) => list.map((t) => (t.id === id ? { ...t, status: approve ? 'concluído' : 'rejeitado' } : t)));
    logAction(`${approve ? 'Aprovou' : 'Rejeitou'} saque de R$ ${item.valor.toFixed(2)} — ${item.usuario}`);
  }

  function addDemoUser() {
    if (!demoForm.nome || !demoForm.email) return;
    setDemoUsers((list) => [...list, { id: `d${Date.now()}`, ...demoForm, saldo: Number(demoForm.saldo) }]);
    logAction(`Criou conta demo "${demoForm.nome}" com saldo fictício de R$ ${Number(demoForm.saldo).toFixed(2)}`);
    setDemoForm({ nome: '', email: '', saldo: 100 });
  }

  function adjustDemoBalance(id, delta) {
    setDemoUsers((list) => list.map((u) => (u.id === id ? { ...u, saldo: Math.max(0, u.saldo + delta) } : u)));
  }

  function removeDemoUser(id) {
    setDemoUsers((list) => list.filter((u) => u.id !== id));
  }

  function addAffiliate() {
    if (!affForm.nome || !affForm.codigo) return;
    setAffiliates((list) => [...list, { id: `a${Date.now()}`, ...affForm, comissaoPct: Number(affForm.comissaoPct), indicados: 0, comissaoAcumulada: 0 }]);
    logAction(`Adicionou afiliado "${affForm.nome}" (código ${affForm.codigo}, ${affForm.comissaoPct}% de comissão)`);
    setAffForm({ nome: '', codigo: '', comissaoPct: 15 });
  }

  const filteredUsers = useMemo(
    () => MOCK_USERS.filter((u) => u.nome.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())),
    [search]
  );

  const totalUsers = MOCK_USERS.length + demoUsers.length;
  const totalDeposited = tx.filter((t) => t.tipo === 'Depósito' && t.status === 'concluído').reduce((s, t) => s + t.valor, 0);
  const totalWithdrawn = tx.filter((t) => t.tipo === 'Saque' && t.status === 'concluído').reduce((s, t) => s + t.valor, 0);
  const pendingTx = tx.filter((t) => t.status === 'pendente').length;

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        input[type=range] { accent-color: ${COLORS.cyan}; }
        .navitem { transition: background .12s ease, color .12s ease; cursor: pointer; }
        .navitem:hover { background: rgba(255,255,255,.06); }
        .row:hover { background: rgba(255,255,255,.03); }
        .iconbtn { cursor: pointer; transition: transform .1s ease, opacity .1s ease; border: none; }
        .iconbtn:active { transform: scale(.92); }
        input[type=text], input[type=email], input[type=number] {
          background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.14); border-radius: 8px;
          padding: 8px 10px; color: #EAF0FF; font-size: 13px; outline: none;
        }
      `}</style>

      <aside style={styles.sidebar}>
        <div style={styles.brand}>
          <span style={styles.brandDot} />
          Block Win <span style={styles.adminTag}>ADMIN</span>
        </div>
        <nav style={{ marginTop: 24 }}>
          {NAV.map(({ key, label, icon: Icon }) => (
            <div
              key={key}
              className="navitem"
              onClick={() => setTab(key)}
              style={{
                ...styles.navItem,
                background: tab === key ? 'rgba(0,210,255,.1)' : 'transparent',
                color: tab === key ? COLORS.cyan : '#AEC0EE',
                borderLeft: tab === key ? `3px solid ${COLORS.cyan}` : '3px solid transparent',
              }}
            >
              <Icon size={16} />
              {label}
              {key === 'tx' && pendingTx > 0 && <span style={styles.navBadge}>{pendingTx}</span>}
            </div>
          ))}
        </nav>
        <div style={styles.demoNotice}>
          <AlertTriangle size={14} color={COLORS.gold} style={{ flexShrink: 0 }} />
          Dashboard de demonstração — usuários "reais" aqui são dados fictícios. Saldo/saque só valem de verdade depois da licença SPA/MF.
        </div>
      </aside>

      <main style={styles.main}>
        {tab === 'overview' && (
          <>
            <h1 style={styles.h1}>Visão geral</h1>
            <div style={styles.statGrid}>
              <StatCard icon={Users} color={COLORS.cyan} label="Usuários cadastrados" value={totalUsers} />
              <StatCard icon={Wallet} color={COLORS.green} label="Depositado (concluído)" value={`R$ ${totalDeposited.toFixed(2)}`} />
              <StatCard icon={TrendingUp} color={COLORS.magenta} label="Sacado (concluído)" value={`R$ ${totalWithdrawn.toFixed(2)}`} />
              <StatCard icon={Activity} color={COLORS.gold} label="Saques pendentes" value={pendingTx} />
            </div>

            <div style={styles.panel}>
              <div style={styles.panelTitle}>RTP real observado — últimos 7 dias</div>
              <div style={{ width: '100%', height: 220 }}>
                <ResponsiveContainer>
                  <LineChart data={MOCK_RTP_SERIES}>
                    <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
                    <XAxis dataKey="dia" stroke="#8FA6D9" fontSize={12} />
                    <YAxis stroke="#8FA6D9" fontSize={12} domain={[70, 100]} unit="%" />
                    <Tooltip contentStyle={{ background: '#0B152F', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, color: '#EAF0FF' }} />
                    <Line type="monotone" dataKey="rtp" stroke={COLORS.cyan} strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <div style={styles.panelCaveat}>Meta configurada: {rtpTarget}% · dado ilustrativo, viria do log real de partidas.</div>
            </div>
          </>
        )}

        {tab === 'users' && (
          <>
            <h1 style={styles.h1}>Usuários</h1>
            <div style={styles.searchBar}>
              <Search size={16} color="#8FA6D9" />
              <input
                type="text"
                placeholder="Buscar por nome ou e-mail…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#EAF0FF', fontSize: 13 }}
              />
            </div>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Nome</th><th style={styles.th}>E-mail</th><th style={styles.th}>Telefone</th>
                    <th style={styles.th}>Cadastro</th><th style={styles.th}>Saldo</th><th style={styles.th}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u) => (
                    <tr key={u.id} className="row">
                      <td style={styles.td}>{u.nome}</td>
                      <td style={{ ...styles.td, color: '#AEC0EE' }}>{u.email}</td>
                      <td style={{ ...styles.td, color: '#AEC0EE' }}>{u.telefone}</td>
                      <td style={{ ...styles.td, color: '#AEC0EE' }}>{u.cadastro}</td>
                      <td style={styles.td}>R$ {u.saldo.toFixed(2)}</td>
                      <td style={styles.td}><StatusBadge status={u.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={styles.panelCaveat}>Saldo de usuários reais só muda por transações confirmadas — não é editável direto aqui. Pra saldo ajustável na mão, use Contas demo.</div>
          </>
        )}

        {tab === 'tx' && (
          <>
            <h1 style={styles.h1}>Transações</h1>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Usuário</th><th style={styles.th}>Tipo</th><th style={styles.th}>Método</th>
                    <th style={styles.th}>Valor</th><th style={styles.th}>Data</th><th style={styles.th}>Status</th><th style={styles.th}></th>
                  </tr>
                </thead>
                <tbody>
                  {tx.map((t) => (
                    <tr key={t.id} className="row">
                      <td style={styles.td}>{t.usuario}</td>
                      <td style={{ ...styles.td, color: t.tipo === 'Depósito' ? COLORS.green : COLORS.magenta, fontWeight: 700 }}>{t.tipo}</td>
                      <td style={{ ...styles.td, color: '#AEC0EE' }}>{t.metodo}</td>
                      <td style={styles.td}>R$ {t.valor.toFixed(2)}</td>
                      <td style={{ ...styles.td, color: '#AEC0EE' }}>{t.data}</td>
                      <td style={styles.td}><StatusBadge status={t.status} /></td>
                      <td style={styles.td}>
                        {t.tipo === 'Saque' && t.status === 'pendente' && (
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button className="iconbtn" onClick={() => resolveTx(t.id, true)} style={{ ...styles.miniBtn, background: 'rgba(40,199,111,.18)', color: COLORS.green }}><Check size={13} /></button>
                            <button className="iconbtn" onClick={() => resolveTx(t.id, false)} style={{ ...styles.miniBtn, background: 'rgba(255,64,129,.18)', color: COLORS.magenta }}><XIcon size={13} /></button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={styles.panelCaveat}>
              Aprovação automática {autoApprove ? `ativa até R$ ${autoApproveLimit.toFixed(2)}` : 'desativada'} — ajuste em Configurações de jogo. Saques acima do limite (ou com auto-aprovação desligada) ficam aqui pra sua decisão manual.
            </div>
          </>
        )}

        {tab === 'demo' && (
          <>
            <h1 style={styles.h1}>Contas demo</h1>
            <p style={styles.panelCaveat}>Contas com saldo fictício pra testar o jogo, o painel e o fluxo de saque sem envolver dinheiro real.</p>
            <div style={styles.panel}>
              <div style={styles.panelTitle}>Criar conta demo</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <input type="text" placeholder="Nome" value={demoForm.nome} onChange={(e) => setDemoForm({ ...demoForm, nome: e.target.value })} style={{ flex: '1 1 160px' }} />
                <input type="email" placeholder="E-mail" value={demoForm.email} onChange={(e) => setDemoForm({ ...demoForm, email: e.target.value })} style={{ flex: '1 1 200px' }} />
                <input type="number" placeholder="Saldo inicial" value={demoForm.saldo} onChange={(e) => setDemoForm({ ...demoForm, saldo: e.target.value })} style={{ width: 130 }} />
                <button className="iconbtn" onClick={addDemoUser} style={styles.primaryMiniBtn}><Plus size={14} /> Criar</button>
              </div>
            </div>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead><tr><th style={styles.th}>Nome</th><th style={styles.th}>E-mail</th><th style={styles.th}>Saldo (fictício)</th><th style={styles.th}></th></tr></thead>
                <tbody>
                  {demoUsers.length === 0 && <tr><td style={styles.td} colSpan={4}>Nenhuma conta demo criada ainda.</td></tr>}
                  {demoUsers.map((u) => (
                    <tr key={u.id} className="row">
                      <td style={styles.td}>{u.nome}</td>
                      <td style={{ ...styles.td, color: '#AEC0EE' }}>{u.email}</td>
                      <td style={styles.td}>R$ {u.saldo.toFixed(2)}</td>
                      <td style={styles.td}>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="iconbtn" onClick={() => adjustDemoBalance(u.id, 50)} style={{ ...styles.miniBtn, background: 'rgba(40,199,111,.18)', color: COLORS.green }}>+50</button>
                          <button className="iconbtn" onClick={() => adjustDemoBalance(u.id, -50)} style={{ ...styles.miniBtn, background: 'rgba(255,64,129,.18)', color: COLORS.magenta }}>-50</button>
                          <button className="iconbtn" onClick={() => removeDemoUser(u.id)} style={{ ...styles.miniBtn, background: 'rgba(255,255,255,.08)', color: '#AEC0EE' }}><XIcon size={12} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'affiliates' && (
          <>
            <h1 style={styles.h1}>Afiliados</h1>
            <p style={styles.panelCaveat}>Cada afiliado tem um código de indicação e uma % de comissão sobre o que os indicados gerarem. Com saldo em modo demo, a comissão também é fictícia.</p>
            <div style={styles.panel}>
              <div style={styles.panelTitle}>Adicionar afiliado</div>
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <input type="text" placeholder="Nome / @perfil" value={affForm.nome} onChange={(e) => setAffForm({ ...affForm, nome: e.target.value })} style={{ flex: '1 1 200px' }} />
                <input type="text" placeholder="Código (ex: LUCAS10)" value={affForm.codigo} onChange={(e) => setAffForm({ ...affForm, codigo: e.target.value.toUpperCase() })} style={{ width: 160 }} />
                <input type="number" placeholder="% comissão" value={affForm.comissaoPct} onChange={(e) => setAffForm({ ...affForm, comissaoPct: e.target.value })} style={{ width: 110 }} />
                <button className="iconbtn" onClick={addAffiliate} style={styles.primaryMiniBtn}><Plus size={14} /> Adicionar</button>
              </div>
            </div>
            <div style={styles.tableWrap}>
              <table style={styles.table}>
                <thead><tr><th style={styles.th}>Afiliado</th><th style={styles.th}>Código</th><th style={styles.th}>Comissão</th><th style={styles.th}>Indicados</th><th style={styles.th}>Acumulado</th></tr></thead>
                <tbody>
                  {affiliates.map((a) => (
                    <tr key={a.id} className="row">
                      <td style={styles.td}>{a.nome}</td>
                      <td style={{ ...styles.td, color: COLORS.gold, fontWeight: 700 }}>{a.codigo}</td>
                      <td style={styles.td}>{a.comissaoPct}%</td>
                      <td style={{ ...styles.td, color: '#AEC0EE' }}>{a.indicados}</td>
                      <td style={styles.td}>R$ {a.comissaoAcumulada.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {tab === 'audit' && (
          <>
            <h1 style={styles.h1}>Auditoria</h1>
            <p style={styles.panelCaveat}>Registro das ações administrativas desta sessão (aprovações, contas demo criadas, afiliados adicionados).</p>
            <div style={styles.panel}>
              {auditLog.map((l) => (
                <div key={l.id} style={styles.auditRow}>
                  <span style={{ color: '#8FA6D9', fontSize: 11, width: 90, flexShrink: 0 }}>{l.ts}</span>
                  <span>{l.text}</span>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'config' && (
          <>
            <h1 style={styles.h1}>Configurações de jogo</h1>
            <div style={styles.panel}>
              <div style={styles.panelTitle}>Motor do jogo</div>
              <SliderRow label="RTP alvo" value={rtpTarget} setValue={setRtpTarget} min={50} max={99} suffix="%" />
              <SliderRow label="Max Win Cap" value={maxWinCap} setValue={setMaxWinCap} min={1} max={50} suffix="x" />
              <SliderRow label="Pontos por R$1 apostado" value={pointsPerReal} setValue={setPointsPerReal} min={10} max={1000} step={10} />
              <div style={styles.toggleRow}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={earlyCashout} onChange={(e) => setEarlyCashout(e.target.checked)} /> Permitir saque antecipado na partida
                </label>
              </div>
              {earlyCashout && <SliderRow label="Libera saque a partir de" value={minCashoutPct} setValue={setMinCashoutPct} min={0} max={90} suffix="%" />}
            </div>

            <div style={styles.panel}>
              <div style={styles.panelTitle}><Wallet size={14} style={{ verticalAlign: -2, marginRight: 6 }} />Aprovação de saques</div>
              <div style={styles.toggleRow}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={autoApprove} onChange={(e) => setAutoApprove(e.target.checked)} /> Aprovar automaticamente saques abaixo do limite
                </label>
              </div>
              {autoApprove && <SliderRow label="Limite de aprovação automática" value={autoApproveLimit} setValue={setAutoApproveLimit} min={10} max={2000} step={10} suffix=" R$" />}
              <div style={styles.panelCaveat}>Acima do limite (ou com isso desligado), o saque cai pendente em Transações até você aprovar ou rejeitar manualmente.</div>
            </div>

            <div style={styles.panel}>
              <div style={styles.panelTitle}><ShieldCheck size={14} style={{ verticalAlign: -2, marginRight: 6 }} />Jogo responsável</div>
              <SliderRow label="Limite de depósito diário por conta" value={dailyDepositLimit} setValue={setDailyDepositLimit} min={50} max={5000} step={50} suffix=" R$" />
              <div style={styles.toggleRow}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={selfExclusionOptions} onChange={(e) => setSelfExclusionOptions(e.target.checked)} /> Oferecer autoexclusão (24h / 7 dias / 30 dias / permanente) na área do usuário
                </label>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, color, label, value }) {
  return (
    <div style={styles.statCard}>
      <div style={{ ...styles.statIcon, background: `${color}22`, color }}><Icon size={18} /></div>
      <div><div style={styles.statLabel}>{label}</div><div style={styles.statValue}>{value}</div></div>
    </div>
  );
}

function SliderRow({ label, value, setValue, min, max, step = 1, suffix = '' }) {
  return (
    <div style={styles.sliderRow}>
      <span style={styles.sliderLabel}>{label}</span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => setValue(Number(e.target.value))} style={{ flex: 1 }} />
      <span style={styles.sliderValue}>{value}{suffix}</span>
    </div>
  );
}

const styles = {
  page: { display: 'flex', minHeight: '100vh', background: 'linear-gradient(160deg, #0D1B3E 0%, #16305F 55%, #1A4B8E 100%)', color: '#EAF0FF', fontFamily: "'Inter', sans-serif" },
  sidebar: { width: 240, flexShrink: 0, padding: '24px 16px', borderRight: '1px solid rgba(255,255,255,.08)', display: 'flex', flexDirection: 'column' },
  brand: { fontFamily: "'Baloo 2', sans-serif", fontWeight: 800, fontSize: 18, display: 'flex', alignItems: 'center', gap: 8 },
  brandDot: { width: 8, height: 8, borderRadius: '50%', background: COLORS.cyan, boxShadow: `0 0 8px ${COLORS.cyan}` },
  adminTag: { fontSize: 10, fontWeight: 700, color: '#8FA6D9', border: '1px solid rgba(255,255,255,.15)', padding: '2px 6px', borderRadius: 6, marginLeft: 4 },
  navItem: { display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 10, fontSize: 14, fontWeight: 600, marginBottom: 4, position: 'relative' },
  navBadge: { marginLeft: 'auto', background: COLORS.magenta, color: '#fff', fontSize: 10, fontWeight: 700, borderRadius: 10, padding: '1px 7px' },
  demoNotice: { marginTop: 'auto', fontSize: 11, color: '#8FA6D9', background: 'rgba(251,192,45,.08)', border: '1px solid rgba(251,192,45,.3)', borderRadius: 10, padding: 10, display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.4 },
  main: { flex: 1, padding: '32px 36px', overflowY: 'auto' },
  h1: { fontFamily: "'Baloo 2', sans-serif", fontSize: 26, fontWeight: 700, marginBottom: 20 },
  statGrid: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 24 },
  statCard: { background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, padding: 18, display: 'flex', gap: 12, alignItems: 'center' },
  statIcon: { width: 38, height: 38, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  statLabel: { fontSize: 11, color: '#8FA6D9', fontWeight: 600 },
  statValue: { fontSize: 20, fontWeight: 800, marginTop: 2 },
  panel: { background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, padding: 22, marginBottom: 20 },
  panelTitle: { fontSize: 13, fontWeight: 700, color: '#AEC0EE', marginBottom: 14 },
  panelCaveat: { fontSize: 12, color: '#8FA6D9', marginTop: 10, lineHeight: 1.5 },
  searchBar: { display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 10, padding: '9px 14px', marginBottom: 16, maxWidth: 340 },
  tableWrap: { background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'left', padding: '12px 16px', fontSize: 11, color: '#8FA6D9', textTransform: 'uppercase', letterSpacing: .4, borderBottom: '1px solid rgba(255,255,255,.08)' },
  td: { padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,.05)' },
  miniBtn: { width: 26, height: 26, borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 },
  primaryMiniBtn: { background: COLORS.green, color: '#06210F', fontWeight: 700, fontSize: 13, padding: '9px 16px', borderRadius: 9, display: 'flex', alignItems: 'center', gap: 6 },
  sliderRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 },
  sliderLabel: { fontSize: 13, width: 240, flexShrink: 0, color: '#EAF0FF' },
  sliderValue: { fontSize: 13, width: 60, textAlign: 'right', color: '#AEC0EE', fontWeight: 700 },
  toggleRow: { fontSize: 13, marginBottom: 14 },
  auditRow: { display: 'flex', gap: 12, fontSize: 13, padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,.05)' },
};
