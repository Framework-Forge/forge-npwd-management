import React, { useEffect, useMemo, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import {
  AlertCircle,
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  BadgeDollarSign,
  Banknote,
  BriefcaseBusiness,
  CheckCircle,
  ChevronRight,
  CircleDollarSign,
  FileText,
  LayoutDashboard,
  LockKeyhole,
  MoreHorizontal,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  UserCog,
  UserMinus,
  UserPlus,
  Users,
  WalletCards,
  X,
} from 'lucide-react';
import {
  CandidateSubmission,
  GradeItem,
  ManagementData,
  Member,
  NearbyPlayer,
  Page,
  RegisterItem,
} from './types';
import { fetchNui } from './utils/fetchNui';
import cssText from './styles.css?inline';

const money = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  maximumFractionDigits: 0,
});

const INITIAL_DATA: ManagementData = {
  authorized: true,
  organization: {
    name: '',
    label: 'Carregando...',
    groupType: 'job',
    motto: 'Sincronizando com a cidade...',
    badge: '...',
    balance: 0,
    playerGradeLevel: 0,
    playerGradeName: 'Carregando...',
    isBoss: false,
    canManage: false,
    totalMembers: 0,
    onlineMembers: 0,
  },
  members: [],
  grades: [],
  candidates: [],
  transactions: [],
  registers: [],
  permissions: {
    currentUser: {},
    byGrade: {},
    byIndividual: {},
    items: [],
  },
  availableJobs: [],
};

const DEFAULT_DATA: ManagementData = {
  authorized: true,
  organization: {
    name: 'police',
    label: 'Policia',
    groupType: 'job',
    motto: 'Disciplina. Proteção. Serviço.',
    badge: 'POL',
    balance: 200,
    playerGradeLevel: 5,
    playerGradeName: 'Coronel',
    isBoss: true,
    canManage: true,
    totalMembers: 6,
    onlineMembers: 3,
  },
  members: [
    { citizenid: 'GS12345', id: 1, name: 'Gabriel Souza', grade: 'Coronel', level: 5, online: true, initials: 'GS', joinedAt: 'Online / Em Serviço' },
    { citizenid: 'ETK100KY', id: 2, name: 'Pierre Mkz', grade: 'Aspira', level: 0, online: true, initials: 'PM', joinedAt: 'Online / Em Serviço' },
    { citizenid: 'MA99887', id: 'MA99887', name: 'Mariana Alves', grade: 'Delegado', level: 3, online: false, initials: 'MA', joinedAt: 'Cadastrado' },
    { citizenid: 'RL11223', id: 'RL11223', name: 'Rafael Lima', grade: 'Sargento', level: 2, online: false, initials: 'RL', joinedAt: 'Cadastrado' },
    { citizenid: 'TM44556', id: 'TM44556', name: 'Thiago Martins', grade: 'Soldado', level: 1, online: false, initials: 'TM', joinedAt: 'Cadastrado' },
  ],
  grades: [
    { name: 'Coronel', level: 5, count: 1, salary: 58, isboss: true },
    { name: 'Major', level: 4, count: 0, salary: 53 },
    { name: 'Delegado', level: 3, count: 1, salary: 42 },
    { name: 'Sargento', level: 2, count: 1, salary: 34 },
    { name: 'Soldado', level: 1, count: 1, salary: 28 },
    { name: 'Aspira', level: 0, count: 1, salary: 23 },
  ],
  registers: [
    { id: 'cofre_praa', label: 'Cofre Praça', stationTitle: 'Praça', balance: 200 },
  ],
  candidates: [
    {
      id: 'cand_1',
      citizenid: 'ETK100KY',
      name: 'Pierre Mkz',
      phone: '1211094579',
      score: 100,
      passed: true,
      status: 'pending',
      submittedAt: 'Recente',
      stationTitle: 'Praça',
      applicationLabel: 'Candidatar-se',
      answers: [
        { question: 'Avaliação Inicial', answer: 'Aprovado com distinção' },
      ],
    },
  ],
  transactions: [
    { id: 'tx_1', title: 'Cofre Praça (Praça)', date: 'Saldo em Cofre Físico', amount: 200, isDeposit: true },
  ],
  permissions: {
    currentUser: { p_members: true, p_grades: true, p_finance: true, p_candidates: true },
    byGrade: {
      '5': { p_members: true, p_grades: true, p_finance: true, p_candidates: true },
      '4': { p_members: true, p_grades: true, p_finance: true, p_candidates: true },
      '3': { p_members: false, p_grades: true, p_finance: false, p_candidates: true },
      '2': { p_members: false, p_grades: true, p_finance: false, p_candidates: false },
      '1': { p_members: false, p_grades: false, p_finance: false, p_candidates: false },
      '0': { p_members: false, p_grades: false, p_finance: false, p_candidates: false },
    },
    byIndividual: {},
    items: [
      { id: 'p_members', name: 'Gerenciar membros', description: 'Contratar, demitir e gerenciar funcionários.' },
      { id: 'p_grades', name: 'Visualizar hierarquia', description: 'Acessar cargos e salários cadastrados.' },
      { id: 'p_finance', name: 'Auditar cofres', description: 'Visualizar saldo físico dos cofres.' },
      { id: 'p_candidates', name: 'Avaliar candidaturas', description: 'Aprovar ou rejeitar formulários.' },
    ],
  },
};

function Header({
  title,
  back,
  onBack,
  onRefresh,
  refreshing,
}: {
  title: string;
  back?: boolean;
  onBack?: () => void;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  return (
    <div className="header">
      {back ? (
        <button className="iconBtn" onClick={onBack} title="Voltar">
          <ArrowLeft size={20} />
        </button>
      ) : (
        <div className="forgeMark">
          <ShieldCheck size={21} />
        </div>
      )}
      <strong>{title}</strong>
      <span className="headerSpacer" />
      {onRefresh && (
        <button
          className={`iconBtn ${refreshing ? 'spinning' : ''}`}
          onClick={onRefresh}
          title="Atualizar Dados"
          disabled={refreshing}
        >
          <RefreshCw size={17} />
        </button>
      )}
    </div>
  );
}

function Bottom({ page, setPage, canHire }: { page: Page; setPage: (p: Page) => void; canHire?: boolean }) {
  const items: [Page, React.ReactNode, string][] = [
    ['home', <LayoutDashboard key="h" />, 'Início'],
    ['members', <Users key="m" />, 'Membros'],
    ...(canHire ? [['hire', <UserPlus key="hr" />, 'Contratar'] as [Page, React.ReactNode, string]] : []),
    ['settings', <MoreHorizontal key="s" />, 'Mais'],
  ];
  return (
    <nav className="bottom">
      {items.map(([p, i, l]) => (
        <button key={p} className={page === p ? 'active' : ''} onClick={() => setPage(p)}>
          {React.cloneElement(i as React.ReactElement, { size: 19 })}
          <span>{l}</span>
        </button>
      ))}
    </nav>
  );
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={'card ' + className}>{children}</div>;
}

export default function App() {
  let routerHistory: any = null;
  let routerLocation: any = null;
  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    routerHistory = useHistory();
    // eslint-disable-next-line react-hooks/rules-of-hooks
    routerLocation = useLocation();
  } catch {
    // fallback if outside router context
  }

  const isBrowser = typeof window !== 'undefined' && !window.invokeNative && !('GetParentResourceName' in window);
  const [data, setData] = useState<ManagementData>(isBrowser ? DEFAULT_DATA : INITIAL_DATA);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [internalPage, setInternalPage] = useState<Page>('home');
  const [historyStack, setHistoryStack] = useState<Page[]>(['home']);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedCandidate, setSelectedCandidate] = useState<CandidateSubmission | null>(null);

  // Sync current page with router path or window.location.hash
  const page: Page = useMemo(() => {
    if (routerLocation?.pathname) {
      const path = routerLocation.pathname;
      if (path.includes('/members')) return 'members';
      if (path.includes('/member')) return 'member';
      if (path.includes('/hire')) return 'hire';
      if (path.includes('/candidates')) return 'candidates';
      if (path.includes('/candidate')) return 'candidate';
      if (path.includes('/grades')) return 'grades';
      if (path.includes('/finance')) return 'finance';
      if (path.includes('/permissions')) return 'permissions';
      if (path.includes('/settings')) return 'settings';
    }
    return internalPage;
  }, [routerLocation?.pathname, internalPage]);

  // Modals state
  const [modalType, setModalType] = useState<'grade' | 'fire' | null>(null);
  const [modalGrade, setModalGrade] = useState<number>(0);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Permissions State
  const [permTab, setPermTab] = useState<'grade' | 'individual'>('grade');
  const [selectedPermGrade, setSelectedPermGrade] = useState<number | null>(null);
  const [selectedPermMemberCid, setSelectedPermMemberCid] = useState<string>('');

  // Hire Form State & Nearby Players
  const [hireTarget, setHireTarget] = useState('');
  const [hireGrade, setHireGrade] = useState<number>(0);
  const [hireMsg, setHireMsg] = useState('');
  const [hireSubmitting, setHireSubmitting] = useState(false);
  const [nearbyPlayers, setNearbyPlayers] = useState<NearbyPlayer[]>([]);
  const [nearbyLoading, setNearbyLoading] = useState(false);

  const fetchNearbyPlayers = async () => {
    setNearbyLoading(true);
    try {
      const resp = await fetchNui<{ status: string; players?: NearbyPlayer[] }>('getNearbyPlayers');
      if (resp && resp.players) {
        setNearbyPlayers(resp.players);
      }
    } catch {
      if (isBrowser) {
        setNearbyPlayers([
          { id: 1, name: 'Pierre Mkz', citizenid: 'ETK100KY', distance: 1.8 },
          { id: 2, name: 'Lucas Silva', citizenid: 'LS990011', distance: 4.2 },
        ]);
      }
    } finally {
      setNearbyLoading(false);
    }
  };

  // Fetch Management Data
  const refreshData = async (jobName?: string) => {
    const targetJob = jobName !== undefined ? jobName : selectedJob;
    setLoading(true);
    try {
      const resp = await fetchNui<{ status: string; data?: ManagementData; authorized?: boolean; reason?: string }>(
        'getManagementData',
        { job: targetJob || undefined }
      );
      if (resp && resp.data) {
        setData(resp.data);
        if (jobName !== undefined) {
          setSelectedJob(jobName);
        }
      }
    } catch {
      if (isBrowser) {
        setData(DEFAULT_DATA);
      }
    } finally {
      setLoading(false);
    }
  };

  // Reset modal/selection when organization changes
  useEffect(() => {
    setSelectedMember(null);
    setSelectedCandidate(null);
    setModalType(null);
  }, [data?.organization?.name]);

  // Inject scoped CSS on mount
  useEffect(() => {
    const STYLE_ID = 'forge-npwd-management_styles';
    let styleEl = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
    if (!styleEl) {
      styleEl = document.createElement('style');
      styleEl.id = STYLE_ID;
      styleEl.textContent = cssText;
      document.head.appendChild(styleEl);
    } else {
      styleEl.textContent = cssText;
    }
  }, []);

  // Synchronize internalPage with window.location.hash and history events
  useEffect(() => {
    const handleHashSync = () => {
      const hash = window.location.hash || '';
      if (!hash.includes('forge-npwd-management')) return;

      let targetPage: Page = 'home';
      if (hash.includes('/members')) targetPage = 'members';
      else if (hash.includes('/member')) targetPage = 'member';
      else if (hash.includes('/hire')) targetPage = 'hire';
      else if (hash.includes('/candidates')) targetPage = 'candidates';
      else if (hash.includes('/candidate')) targetPage = 'candidate';
      else if (hash.includes('/grades')) targetPage = 'grades';
      else if (hash.includes('/finance')) targetPage = 'finance';
      else if (hash.includes('/permissions')) targetPage = 'permissions';
      else if (hash.includes('/settings')) targetPage = 'settings';

      setModalType(null);
      setInternalPage(targetPage);
    };

    window.addEventListener('popstate', handleHashSync);
    window.addEventListener('hashchange', handleHashSync);

    return () => {
      window.removeEventListener('popstate', handleHashSync);
      window.removeEventListener('hashchange', handleHashSync);
    };
  }, []);

  // Update whenever route pathname changes / entering the app
  useEffect(() => {
    if (routerLocation?.pathname?.includes('forge-npwd-management') || !routerLocation) {
      refreshData();
    }
  }, [routerLocation?.pathname]);

  // Carregar jogadores próximos ao acessar a tela de contratação
  useEffect(() => {
    if (page === 'hire') {
      fetchNearbyPlayers();
    }
  }, [page]);

  // Real-time synchronization on window focus, NPWD phone visibility, or NUI messages
  useEffect(() => {
    const handleFocus = () => {
      refreshData();
    };

    const handleMessage = (e: MessageEvent) => {
      const d = e.data;
      if (!d) return;

      // 1. Back button from NPWD virtual navigation bar or client event
      if (
        d.action === 'back' ||
        d.method === 'forge-npwd:back' ||
        d.action === 'forge-npwd:back' ||
        d.type === 'forge-npwd:back' ||
        d.event === 'back' ||
        (d.app === 'PHONE' && (d.method === 'back' || d.action === 'back'))
      ) {
        handleBack();
        return;
      }

      // 2. Direct app messages (from sendToApp or client Lua)
      if (
        d.app === 'forge-npwd-management' ||
        d.app === 'forge-npwd-management' ||
        d.action === 'refreshManagement' ||
        d.method === 'refreshManagement'
      ) {
        refreshData();
        return;
      }

      // 3. NPWD phone opened / visibility changed
      if (d.app === 'PHONE' && (d.method === 'forge-npwd:setVisibility' || d.action === 'forge-npwd:setVisibility') && d.data === true) {
        refreshData();
        return;
      }

      // 4. NPWD app opened
      if (d.app === 'PHONE' && (d.method === 'forge-npwd:openApp' || d.action === 'forge-npwd:openApp')) {
        if (d.data === 'forge-npwd-management' || d.data === 'forge-npwd-management') {
          refreshData();
          return;
        }
      }
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('message', handleMessage);
    };
  }, [selectedJob, page, modalType]);

  // Navigation handlers
  const navigateTo = (nextPage: Page) => {
    if (modalType) setModalType(null);
    const targetHash = nextPage === 'home' ? '#/forge-npwd-management' : `#/forge-npwd-management/${nextPage}`;
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
    setHistoryStack((prev) => [...prev, nextPage]);
    setInternalPage(nextPage);

    if (routerHistory) {
      try {
        const targetPath = nextPage === 'home' ? '/forge-npwd-management' : `/forge-npwd-management/${nextPage}`;
        if (routerLocation?.pathname !== targetPath) {
          routerHistory.push(targetPath);
        }
      } catch {
        // ignore router errors
      }
    }
  };

  const handleBack = () => {
    if (modalType) {
      setModalType(null);
      return;
    }
    if (page !== 'home') {
      if (routerHistory && routerLocation && routerLocation.pathname !== '/forge-npwd-management') {
        routerHistory.goBack();
      } else if (window.history.length > 1) {
        window.history.back();
      } else {
        navigateTo('home');
      }
    } else {
      // Já está em home: voltar ao desktop do celular
      if (window.history.length > 1) {
        window.history.back();
      } else {
        window.location.hash = '#/';
      }
    }
  };

  // Keyboard navigation (Escape key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (modalType) {
          setModalType(null);
        } else if (page !== 'home') {
          handleBack();
        } else {
          fetchNui('closePhone');
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [modalType, page]);

  const showFeedback = (msg: string) => {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(null), 3500);
  };

  // Actions
  const handleHireSubmit = async () => {
    if (!hireTarget.trim()) {
      showFeedback('Por favor, informe o ID ou CitizenID do jogador.');
      return;
    }
    setHireSubmitting(true);
    try {
      const res = await fetchNui<{ status: string; success: boolean; message?: string }>('hireEmployee', {
        target: hireTarget.trim(),
        grade: Number(hireGrade) || 0,
        message: hireMsg,
        job: org.name,
      });
      if (res?.success || res?.status === 'ok') {
        showFeedback('Novo recruta contratado com sucesso!');
        setHireTarget('');
        setHireMsg('');
        refreshData();
        navigateTo('members');
      } else {
        showFeedback(res?.message || 'Falha ao contratar o jogador.');
      }
    } catch {
      showFeedback('Novo recruta contratado (modo de simulação)!');
      navigateTo('members');
    } finally {
      setHireSubmitting(false);
    }
  };

  const handleFireEmployee = async () => {
    if (!selectedMember) return;
    const cid = selectedMember.citizenid;
    const mName = selectedMember.name;
    try {
      const res = await fetchNui<{ status: string; success: boolean; message?: string }>('fireEmployee', {
        citizenid: cid,
        job: org.name,
      });
      if (res?.success || res?.status === 'ok') {
        showFeedback(`${mName} foi demitido da organização.`);
        setModalType(null);
        setSelectedMember(null);
        setData((prev) => ({
          ...prev,
          members: prev.members.filter((m) => m.citizenid !== cid),
          organization: {
            ...prev.organization,
            totalMembers: Math.max(0, prev.organization.totalMembers - 1),
          },
        }));
        refreshData();
        navigateTo('members');
      } else {
        showFeedback(res?.message || 'Falha ao demitir membro.');
      }
    } catch {
      showFeedback(`${mName} foi demitido (simulação).`);
      setModalType(null);
      setSelectedMember(null);
      setData((prev) => ({
        ...prev,
        members: prev.members.filter((m) => m.citizenid !== cid),
        organization: {
          ...prev.organization,
          totalMembers: Math.max(0, prev.organization.totalMembers - 1),
        },
      }));
      navigateTo('members');
    }
  };

  const org = data?.organization || (isBrowser ? DEFAULT_DATA.organization : INITIAL_DATA.organization);
  const members = data?.members || (isBrowser ? DEFAULT_DATA.members : []);
  const grades = data?.grades || (isBrowser ? DEFAULT_DATA.grades : []);
  const candidates = data?.candidates || (isBrowser ? DEFAULT_DATA.candidates : []);
  const transactions = data?.transactions || (isBrowser ? DEFAULT_DATA.transactions : []);
  const registers = data?.registers || (isBrowser ? (DEFAULT_DATA.registers || []) : []);
  const permissions = data?.permissions || (isBrowser ? DEFAULT_DATA.permissions : INITIAL_DATA.permissions);

  const isBoss = Boolean(org.isBoss);
  const userPerms = permissions?.currentUser || {};
  const canManageMembers = isBoss || Boolean(userPerms.p_members);
  const canViewGrades = isBoss || Boolean(userPerms.p_grades);
  const canViewFinance = isBoss || Boolean(userPerms.p_finance);
  const canViewCandidates = isBoss || Boolean(userPerms.p_candidates);

  const sortedGrades = useMemo(() => {
    return [...grades].sort((a, b) => a.level - b.level);
  }, [grades]);

  const minGradeLevel = sortedGrades.length > 0 ? sortedGrades[0].level : 0;
  const maxGradeLevel = sortedGrades.length > 0 ? sortedGrades[sortedGrades.length - 1].level : 0;

  const nextGrade = useMemo(() => {
    if (!selectedMember) return null;
    return sortedGrades.find((g) => g.level > selectedMember.level) || null;
  }, [selectedMember, sortedGrades]);

  const prevGrade = useMemo(() => {
    if (!selectedMember) return null;
    return [...sortedGrades].reverse().find((g) => g.level < selectedMember.level) || null;
  }, [selectedMember, sortedGrades]);

  const permItems = useMemo(() => {
    return permissions?.items && permissions.items.length > 0
      ? permissions.items
      : [
          { id: 'p_members', name: 'Gerenciar membros', description: 'Contratar, demitir e gerenciar funcionários.' },
          { id: 'p_grades', name: 'Visualizar hierarquia', description: 'Acessar cargos e salários cadastrados.' },
          { id: 'p_finance', name: 'Auditar cofres', description: 'Visualizar saldo físico dos cofres.' },
          { id: 'p_candidates', name: 'Avaliar candidaturas', description: 'Aprovar ou rejeitar formulários.' },
        ];
  }, [permissions]);

  useEffect(() => {
    if (page === 'permissions' && !isBoss) {
      navigateTo('home');
    } else if (page === 'hire' && !canManageMembers) {
      navigateTo('home');
    } else if ((page === 'candidates' || page === 'candidate') && !canViewCandidates) {
      navigateTo('home');
    } else if (page === 'finance' && !canViewFinance) {
      navigateTo('home');
    } else if (page === 'grades' && !canViewGrades) {
      navigateTo('home');
    }
  }, [page, isBoss, canManageMembers, canViewCandidates, canViewFinance, canViewGrades]);

  useEffect(() => {
    if (grades && grades.length > 0 && selectedPermGrade === null) {
      setSelectedPermGrade(grades[0].level);
    }
  }, [grades, selectedPermGrade]);

  useEffect(() => {
    if (members && members.length > 0 && !selectedPermMemberCid) {
      setSelectedPermMemberCid(members[0].citizenid);
    }
  }, [members, selectedPermMemberCid]);

  const handleChangeGrade = async (newGradeLevel: number) => {
    if (!selectedMember) return;
    const cid = selectedMember.citizenid;
    const gradeObj = sortedGrades.find((g) => g.level === newGradeLevel);
    if (!gradeObj) {
      showFeedback('Cargo selecionado não existe para esta organização.');
      return;
    }
    const newGradeName = gradeObj.name;

    try {
      const res = await fetchNui<{ status: string; success: boolean; message?: string }>('setEmployeeGrade', {
        citizenid: cid,
        grade: newGradeLevel,
        job: org.name,
      });
      if (res?.success || res?.status === 'ok') {
        showFeedback('Cargo alterado com sucesso!');
        setModalType(null);
        setSelectedMember((prev) => (prev ? { ...prev, level: newGradeLevel, grade: newGradeName } : null));
        setData((prev) => ({
          ...prev,
          members: prev.members.map((m) =>
            m.citizenid === cid ? { ...m, level: newGradeLevel, grade: newGradeName } : m
          ),
        }));
        refreshData();
      } else {
        showFeedback(res?.message || 'Falha ao alterar cargo.');
      }
    } catch {
      showFeedback('Cargo alterado com sucesso (simulação)!');
      setModalType(null);
      setSelectedMember((prev) => (prev ? { ...prev, level: newGradeLevel, grade: newGradeName } : null));
      setData((prev) => ({
        ...prev,
        members: prev.members.map((m) =>
          m.citizenid === cid ? { ...m, level: newGradeLevel, grade: newGradeName } : m
        ),
      }));
    }
  };

  const handleCandidateReview = async (candidateId: string | number, status: 'accepted' | 'rejected') => {
    try {
      const res = await fetchNui<{ status: string; success: boolean; message?: string }>('reviewCandidate', {
        candidateId,
        status,
        job: org.name,
      });
      if (res?.success || res?.status === 'ok') {
        showFeedback(status === 'accepted' ? 'Candidato aprovado e contratado!' : 'Candidatura rejeitada.');
        refreshData();
        navigateTo('candidates');
      } else {
        showFeedback(res?.message || 'Falha ao atualizar candidatura.');
      }
    } catch {
      showFeedback(status === 'accepted' ? 'Candidato aprovado!' : 'Candidatura rejeitada!');
      navigateTo('candidates');
    }
  };

  const handleToggleGradePerm = async (permId: string) => {
    const currentGrade = selectedPermGrade ?? (grades[0]?.level ?? 0);
    const gradeKey = String(currentGrade);
    const currentVal = Boolean(data.permissions?.byGrade?.[gradeKey]?.[permId]);
    const newVal = !currentVal;

    setData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        byGrade: {
          ...prev.permissions?.byGrade,
          [gradeKey]: {
            ...prev.permissions?.byGrade?.[gradeKey],
            [permId]: newVal,
          },
        },
      },
    }));

    try {
      const res = await fetchNui<{ status: string; success: boolean; message?: string }>('setGradePermission', {
        job: org.name,
        grade: currentGrade,
        permId,
        value: newVal,
      });
      if (res?.success || res?.status === 'ok') {
        showFeedback('Permissão do cargo atualizada!');
      } else {
        showFeedback(res?.message || 'Falha ao atualizar permissão do cargo.');
      }
    } catch {
      showFeedback('Permissão do cargo atualizada (simulação)!');
    }
  };

  const handleToggleMemberPerm = async (permId: string) => {
    if (!selectedPermMemberCid) return;
    const member = members.find((m) => m.citizenid === selectedPermMemberCid);
    const memberGradeKey = String(member?.level ?? 0);
    const customPerms = data.permissions?.byIndividual?.[selectedPermMemberCid] || {};
    const gradePerms = data.permissions?.byGrade?.[memberGradeKey] || {};
    const effectiveVal = customPerms[permId] !== undefined
      ? Boolean(customPerms[permId])
      : Boolean(gradePerms[permId]);
    const newVal = !effectiveVal;

    setData((prev) => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        byIndividual: {
          ...prev.permissions?.byIndividual,
          [selectedPermMemberCid]: {
            ...customPerms,
            [permId]: newVal,
          },
        },
      },
    }));

    try {
      const res = await fetchNui<{ status: string; success: boolean; message?: string }>('setMemberPermission', {
        job: org.name,
        citizenid: selectedPermMemberCid,
        permId,
        value: newVal,
      });
      if (res?.success || res?.status === 'ok') {
        showFeedback('Permissão individual atualizada!');
      } else {
        showFeedback(res?.message || 'Falha ao atualizar permissão individual.');
      }
    } catch {
      showFeedback('Permissão individual atualizada (simulação)!');
    }
  };

  const handleResetMemberPerms = async () => {
    if (!selectedPermMemberCid) return;

    setData((prev) => {
      const nextIndiv = { ...(prev.permissions?.byIndividual || {}) };
      delete nextIndiv[selectedPermMemberCid];
      return {
        ...prev,
        permissions: {
          ...prev.permissions,
          byIndividual: nextIndiv,
        },
      };
    });

    try {
      const res = await fetchNui<{ status: string; success: boolean; message?: string }>('resetMemberPermissions', {
        job: org.name,
        citizenid: selectedPermMemberCid,
      });
      if (res?.success || res?.status === 'ok') {
        showFeedback('Permissões restauradas para o padrão do cargo!');
      } else {
        showFeedback(res?.message || 'Falha ao redefinir permissões.');
      }
    } catch {
      showFeedback('Permissões restauradas para o padrão do cargo (simulação)!');
    }
  };

  const handleOpenMemberPermissions = (member: Member) => {
    setSelectedPermMemberCid(member.citizenid);
    setPermTab('individual');
    navigateTo('permissions');
  };

  // Filtered members list
  const [memberSearch, setMemberSearch] = useState('');
  const [memberFilter, setMemberFilter] = useState<'all' | 'online' | 'offline'>('all');
  const filteredMembers = useMemo(() => {
    return members.filter((m) => {
      const matchSearch =
        m.name.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.grade.toLowerCase().includes(memberSearch.toLowerCase()) ||
        m.citizenid.toLowerCase().includes(memberSearch.toLowerCase());
      if (!matchSearch) return false;
      if (memberFilter === 'online') return m.online;
      if (memberFilter === 'offline') return !m.online;
      return true;
    });
  }, [members, memberSearch, memberFilter]);

  const onlineCount = useMemo(() => members.filter((m) => m.online).length, [members]);
  const offlineCount = useMemo(() => members.length - onlineCount, [members, onlineCount]);

  // Page title mapping
  const titleMap: Record<Page, string> = {
    home: 'Forge Management',
    members: 'Membros da Organização',
    member: selectedMember?.name || 'Detalhes do Membro',
    hire: 'Contratar Recruta',
    candidates: 'Candidaturas',
    candidate: selectedCandidate?.name || 'Avaliação de Candidato',
    grades: 'Cargos e Salários',
    finance: 'Cofre & Finanças',
    permissions: 'Permissões de Acesso',
    settings: 'Forge Management',
  };

  if (data?.authorized === false) {
    return (
      <div className="app forge-mgmt-app">
        <Header title="Acesso Restrito" onRefresh={() => refreshData()} refreshing={loading} />
        <div className="restrictedScreen">
          <div className="restrictedIcon">
            <ShieldAlert size={40} />
          </div>
          <h2>Acesso Não Autorizado</h2>
          <p>
            {data.reason ||
              'Você precisa ser Chefe, Comandante ou possuir permissão administrativa na organização para acessar este painel.'}
          </p>
          {data.availableJobs && data.availableJobs.length > 0 && (
            <div style={{ marginTop: 14, width: '100%', textAlign: 'left' }}>
              <div style={{ fontSize: 11, color: '#91a0aa', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 1 }}>
                Suas Organizações Disponíveis:
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {data.availableJobs.map((j) => (
                  <button
                    key={j.name}
                    className="card"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      cursor: 'pointer',
                      border: '1px solid #253640',
                      background: '#111d25',
                      color: '#fff',
                      borderRadius: 8,
                      width: '100%',
                    }}
                    onClick={() => refreshData(j.name)}
                  >
                    <div>
                      <strong style={{ fontSize: 13, color: '#10b981' }}>{j.label}</strong>
                      <div style={{ fontSize: 11, color: '#91a0aa' }}>{j.gradeName}</div>
                    </div>
                    <ChevronRight size={16} color="#91a0aa" />
                  </button>
                ))}
              </div>
            </div>
          )}
          <button className="primary" style={{ marginTop: 16 }} onClick={() => fetchNui('closePhone')}>
            Fechar Aplicativo
          </button>
        </div>
      </div>
    );
  }

  const isSubpage = page !== 'home' && page !== 'settings';

  return (
    <div className="app forge-mgmt-app">
      {/* Toast Notice */}
      {actionNotice && (
        <div
          style={{
            position: 'absolute',
            top: 58,
            left: 14,
            right: 14,
            background: '#047857',
            color: '#fff',
            padding: '10px 14px',
            borderRadius: 8,
            zIndex: 99,
            fontSize: 12,
            boxShadow: '0 4px 15px rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <CheckCircle size={16} />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Header */}
      {isSubpage && (
        <Header
          title={titleMap[page]}
          back={true}
          onBack={handleBack}
          onRefresh={() => refreshData()}
          refreshing={loading}
        />
      )}

      <div className="scroll">
        {/* HOME DASHBOARD */}
        {page === 'home' && (
          <>
            <div className="hero">
              <div className="brand" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldCheck />
                  <div>
                    <b>FORGE</b>
                    <small>MANAGEMENT</small>
                  </div>
                </div>
                <button
                  className={`iconBtn ${loading ? 'spinning' : ''}`}
                  onClick={() => refreshData()}
                  title="Atualizar Dados"
                  style={{ color: '#10b981' }}
                >
                  <RefreshCw size={17} />
                </button>
              </div>
              <div className="org">
                <div>
                  <h1>{org.label}</h1>
                  <p>{org.motto}</p>
                </div>
                <div className="seal">{org.badge}</div>
              </div>
              {data.availableJobs && data.availableJobs.length > 1 && (
                <div className="jobSelectContainer">
                  <BriefcaseBusiness size={14} color="#10b981" />
                  <select
                    className="jobSelect"
                    value={org.name}
                    onChange={(e) => {
                      refreshData(e.target.value);
                    }}
                    title="Alternar Organização de Gestão"
                  >
                    {data.availableJobs.map((j) => (
                      <option key={j.name} value={j.name}>
                        {j.label} ({j.gradeName}){j.active ? ' [Ativo]' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <main>
              <Card>
                <span className="muted">Bem-vindo de volta,</span>
                <h2>{org.playerGradeName}</h2>
                <p className="muted">Gerencie membros, finanças e candidaturas com facilidade.</p>

                <div className="stats">
                  <div>
                    <Users />
                    <span>
                      <small>Membros</small>
                      <b>{org.totalMembers || members.length}</b>
                    </span>
                  </div>
                  <div>
                    <UserCog />
                    <span>
                      <small>Online</small>
                      <b>{onlineCount}</b>
                    </span>
                  </div>
                  {canViewFinance && (
                    <div className="wide">
                      <CircleDollarSign />
                      <span>
                        <small>Saldo em Cofres Físicos</small>
                        <b>{money.format(org.balance || 0)}</b>
                      </span>
                    </div>
                  )}
                </div>
              </Card>

              <h3>Ações Rápidas</h3>
              <div className="quick">
                <button onClick={() => navigateTo('members')}>
                  <Users />
                  Ver Membros
                </button>
                {canViewGrades && (
                  <button onClick={() => navigateTo('grades')}>
                    <BriefcaseBusiness />
                    Cargos
                  </button>
                )}
                {canManageMembers && (
                  <button onClick={() => navigateTo('hire')}>
                    <UserPlus />
                    Contratar
                  </button>
                )}
                {canViewCandidates && (
                  <button onClick={() => navigateTo('candidates')}>
                    <FileText />
                    Candidaturas
                  </button>
                )}
                {canViewFinance && (
                  <button onClick={() => navigateTo('finance')}>
                    <Banknote />
                    Cofre Físico
                  </button>
                )}
                {isBoss && (
                  <button onClick={() => navigateTo('permissions')}>
                    <LockKeyhole />
                    Permissões
                  </button>
                )}
              </div>
            </main>
          </>
        )}

        {/* MEMBERS LIST */}
        {page === 'members' && (
          <main>
            <div className="search">
              <Search size={18} />
              <input
                value={memberSearch}
                onChange={(e) => setMemberSearch(e.target.value)}
                placeholder="Buscar por nome, cargo ou citizenid..."
              />
            </div>

            <div className="chips">
              <span className={memberFilter === 'all' ? 'selected' : ''} onClick={() => setMemberFilter('all')}>
                Todos <b>{members.length}</b>
              </span>
              <span className={memberFilter === 'online' ? 'selected' : ''} onClick={() => setMemberFilter('online')}>
                Online <b>{onlineCount}</b>
              </span>
              <span className={memberFilter === 'offline' ? 'selected' : ''} onClick={() => setMemberFilter('offline')}>
                Offline <b>{offlineCount}</b>
              </span>
            </div>

            <div className="list">
              {filteredMembers.length === 0 ? (
                <div className="emptyState">Nenhum membro encontrado.</div>
              ) : (
                filteredMembers.map((m) => (
                  <button
                    className="member"
                    key={m.citizenid}
                    onClick={() => {
                      setSelectedMember(m);
                      navigateTo('member');
                    }}
                  >
                    <div className="avatar">{m.initials}</div>
                    <div className="memberText">
                      <b>{m.name}</b>
                      <small>
                        {m.grade} • Nível {m.level}
                      </small>
                    </div>
                    <span className={m.online ? 'status online' : 'status offline'}>
                      {m.online ? 'Online' : 'Offline'}
                    </span>
                    <ChevronRight size={17} />
                  </button>
                ))
              )}
            </div>
          </main>
        )}

        {/* MEMBER DETAIL */}
        {page === 'member' && selectedMember && (
          <main>
            <Card className="profile">
              <div className="avatar big">{selectedMember.initials}</div>
              <div>
                <h2>{selectedMember.name}</h2>
                <span className="muted">CitizenID: {selectedMember.citizenid}</span>
                <div style={{ marginTop: 4 }}>
                  <span className={selectedMember.online ? 'status online' : 'status offline'}>
                    {selectedMember.online ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            </Card>

            <Card>
              <small className="muted">Cargo Atual</small>
              <h2>{selectedMember.grade}</h2>
              <p className="muted">Hierarquia Nível {selectedMember.level}</p>
            </Card>

            <div className="memberMeta">
              <span>
                <small>Ingressou em</small>
                <b>{selectedMember.joinedAt || 'Registro Geral'}</b>
              </span>
              <span>
                <small>Status</small>
                <b className="green">Ativo</b>
              </span>
            </div>

            {(() => {
              const isSelf = selectedMember.citizenid === org.playerCitizenId;
              const isTargetHigherOrEqual = !isBoss && selectedMember.level >= org.playerGradeLevel;
              const canEditTarget = canManageMembers && !isSelf && !isTargetHigherOrEqual;

              return (
                <>
                  {isSelf && (
                    <div style={{ margin: '10px 0', padding: '10px 14px', borderRadius: 8, background: '#1c2936', border: '1px solid #2d4154', textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
                      Seu Perfil • Gerenciado pela liderança da organização.
                    </div>
                  )}

                  {!isSelf && isTargetHigherOrEqual && (
                    <div style={{ margin: '10px 0', padding: '10px 14px', borderRadius: 8, background: '#1c2936', border: '1px solid #2d4154', textAlign: 'center', fontSize: 12, color: '#94a3b8' }}>
                      Membro com patente igual ou superior à sua (Apenas Leitura).
                    </div>
                  )}

                  <div className="actions">
                    {canEditTarget && (
                      <>
                        <button
                          className="primary"
                          disabled={!nextGrade || (!isBoss && nextGrade.level >= org.playerGradeLevel)}
                          onClick={() => nextGrade && handleChangeGrade(nextGrade.level)}
                          title={
                            !nextGrade
                              ? 'Já está no cargo máximo'
                              : (!isBoss && nextGrade.level >= org.playerGradeLevel)
                              ? 'Você não pode promover para um cargo igual ou superior ao seu'
                              : `Promover para ${nextGrade.name} (Nível ${nextGrade.level})`
                          }
                          style={
                            !nextGrade || (!isBoss && nextGrade.level >= org.playerGradeLevel)
                              ? { opacity: 0.4, cursor: 'not-allowed' }
                              : undefined
                          }
                        >
                          ↑ Promover
                        </button>
                        <button
                          disabled={!prevGrade}
                          onClick={() => prevGrade && handleChangeGrade(prevGrade.level)}
                          title={prevGrade ? `Rebaixar para ${prevGrade.name} (Nível ${prevGrade.level})` : 'Já está no cargo inicial'}
                          style={!prevGrade ? { opacity: 0.4, cursor: 'not-allowed' } : undefined}
                        >
                          ↓ Rebaixar
                        </button>
                        <button
                          className="blue"
                          onClick={() => {
                            setModalGrade(selectedMember.level);
                            setModalType('grade');
                          }}
                        >
                          ✎ Alterar Cargo
                        </button>
                      </>
                    )}

                    {isBoss && !isSelf && (
                      <button className="purple" onClick={() => handleOpenMemberPermissions(selectedMember)}>
                        🔒 Permissões
                      </button>
                    )}

                    {canEditTarget && (
                      <button className="danger wideBtn" onClick={() => setModalType('fire')}>
                        Demitir Funcionário
                      </button>
                    )}
                  </div>
                </>
              );
            })()}

            <h3>Histórico e Progressão</h3>
            <Card>
              <div className="history">
                <ShieldCheck />
                <span>
                  <b>{selectedMember.grade}</b>
                  <small>Cargo Atual</small>
                </span>
                <ChevronRight />
              </div>
            </Card>
          </main>
        )}

        {/* HIRE PLAYER */}
        {page === 'hire' && (
          <main>
            <Card className="hireIntro">
              <div className="roundIcon">
                <UserPlus />
              </div>
              <div>
                <h2>Novo Recruta</h2>
                <p className="muted">Contrate um novo cidadão para a corporação.</p>
              </div>
            </Card>

            {/* JOGADORES PRÓXIMOS */}
            <div className="nearbySection">
              <div className="nearbyHeader">
                <span>Jogadores Próximos</span>
                <button
                  className="nearbyRefreshBtn"
                  onClick={fetchNearbyPlayers}
                  disabled={nearbyLoading}
                  type="button"
                >
                  <RefreshCw size={12} className={nearbyLoading ? 'spinning' : ''} />
                  {nearbyLoading ? 'Buscando...' : 'Buscar'}
                </button>
              </div>

              {nearbyPlayers.length === 0 ? (
                <div className="muted" style={{ padding: '8px 4px', fontSize: 11 }}>
                  {nearbyLoading ? 'Localizando jogadores ao seu redor...' : 'Nenhum jogador detectado em até 15 metros.'}
                </div>
              ) : (
                <div className="nearbyList">
                  {nearbyPlayers.map((np) => (
                    <div
                      key={np.id}
                      className={`nearbyItem ${hireTarget === String(np.id) ? 'selected' : ''}`}
                      onClick={() => setHireTarget(String(np.id))}
                      title="Clique para preencher o ID automaticamente"
                    >
                      <div className="nearbyItemInfo">
                        <b>{np.name}</b>
                        <small>ID: {np.id} {np.citizenid ? `• ${np.citizenid}` : ''}</small>
                      </div>
                      <span className="nearbyDistanceBadge">{np.distance}m</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <label>
              ID do Servidor ou CitizenID
              <input
                placeholder="Ex: 24 ou ABC12345"
                value={hireTarget}
                onChange={(e) => setHireTarget(e.target.value)}
              />
            </label>

            <label>
              Cargo Inicial
              <select value={hireGrade} onChange={(e) => setHireGrade(Number(e.target.value))}>
                {grades.map((g) => (
                  <option key={g.level} value={g.level}>
                    {g.name} (Nível {g.level})
                  </option>
                ))}
              </select>
            </label>

            <label>
              Mensagem de Boas-vindas (opcional)
              <textarea
                placeholder="Instruções para o novo funcionário (enviadas por e-mail)..."
                value={hireMsg}
                onChange={(e) => setHireMsg(e.target.value)}
              />
            </label>

            <div className="info">
              ✉ Ao contratar, o jogador receberá um e-mail oficial de boas-vindas com o cargo via Forge NPWD Mail.
            </div>

            <button className="cta" onClick={handleHireSubmit} disabled={hireSubmitting}>
              {hireSubmitting ? 'Contratando...' : 'Contratar Jogador'}
            </button>
          </main>
        )}

        {/* CANDIDATES / APPLICATIONS LIST */}
        {page === 'candidates' && (
          <main>
            <div className="sectionTitle">
              <h3>Formulários de Recrutamento</h3>
              <span>{candidates.length} candidaturas</span>
            </div>

            <div className="list">
              {candidates.length === 0 ? (
                <div className="emptyState">Nenhuma candidatura pendente no momento.</div>
              ) : (
                candidates.map((c) => (
                  <button
                    className="candidateItem"
                    key={c.id}
                    onClick={() => {
                      setSelectedCandidate(c);
                      navigateTo('candidate');
                    }}
                  >
                    <div className="avatar">{c.name.slice(0, 2).toUpperCase()}</div>
                    <div className="memberText">
                      <b>{c.name}</b>
                      <small>{c.stationTitle || 'Estação Geral'} • {c.submittedAt || 'Recente'}</small>
                    </div>
                    {c.score !== undefined && (
                      <span className={`candidateScore ${c.passed ? 'passed' : 'failed'}`}>
                        {c.score}%
                      </span>
                    )}
                    <span className={`status ${c.status}`}>
                      {c.status === 'accepted' ? 'Aprovado' : c.status === 'rejected' ? 'Rejeitado' : 'Pendente'}
                    </span>
                    <ChevronRight size={17} />
                  </button>
                ))
              )}
            </div>
          </main>
        )}

        {/* CANDIDATE DETAIL */}
        {page === 'candidate' && selectedCandidate && (
          <main>
            <Card className="profile">
              <div className="avatar big">{selectedCandidate.name.slice(0, 2).toUpperCase()}</div>
              <div>
                <h2>{selectedCandidate.name}</h2>
                <span className="muted">CitizenID: {selectedCandidate.citizenid}</span>
                {selectedCandidate.phone && <span className="muted">Telefone: {selectedCandidate.phone}</span>}
                <div style={{ marginTop: 4 }}>
                  <span className={`status ${selectedCandidate.status}`}>
                    {selectedCandidate.status === 'accepted'
                      ? 'Aprovado'
                      : selectedCandidate.status === 'rejected'
                      ? 'Rejeitado'
                      : 'Pendente de Avaliação'}
                  </span>
                </div>
              </div>
            </Card>

            <Card>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <small className="muted">Pontuação do Teste</small>
                  <h2>{selectedCandidate.score ?? 70}%</h2>
                </div>
                <div className={`candidateScore ${selectedCandidate.passed ? 'passed' : 'failed'}`} style={{ fontSize: 13, padding: '6px 12px' }}>
                  {selectedCandidate.passed ? 'Aprovado no Exame' : 'Abaixo do Corte'}
                </div>
              </div>
            </Card>

            {selectedCandidate.answers && selectedCandidate.answers.length > 0 && (
              <>
                <h3>Respostas do Questionário</h3>
                <div className="candidateAnswers">
                  {selectedCandidate.answers.map((ans, idx) => (
                    <div className="candidateAnswer" key={idx}>
                      <small>{ans.question}</small>
                      <b>{ans.answer}</b>
                    </div>
                  ))}
                </div>
              </>
            )}

            {selectedCandidate.status === 'pending' && (
              <div className="actions" style={{ marginTop: 16 }}>
                <button
                  className="primary"
                  onClick={() => handleCandidateReview(selectedCandidate.id, 'accepted')}
                >
                  <UserCheck size={18} /> Aprovar & Contratar
                </button>
                <button
                  className="danger wideBtn"
                  onClick={() => handleCandidateReview(selectedCandidate.id, 'rejected')}
                >
                  <UserMinus size={18} /> Rejeitar Candidatura
                </button>
              </div>
            )}
          </main>
        )}

        {/* GRADES / RANKS */}
        {page === 'grades' && (
          <main>
            <div className="sectionTitle">
              <h3>Hierarquia da Organização</h3>
              <span>{grades.length} patentes</span>
            </div>

            <div className="list">
              {grades.map((g) => (
                <div className="grade" key={g.level}>
                  <div className="rank">
                    <ShieldCheck />
                  </div>
                  <span>
                    <b>{g.name}</b>
                    <small>Nível {g.level} {g.salary ? `• Salário: ${money.format(g.salary)}` : ''}</small>
                  </span>
                  <em>{g.count} membros</em>
                </div>
              ))}
            </div>
          </main>
        )}

        {/* FINANCE / SAFE */}
        {page === 'finance' && (
          <main>
            <Card className="balance">
              <WalletCards />
              <div>
                <small>Saldo em Cofres Físicos</small>
                <h1>{money.format(org.balance || 0)}</h1>
                <span className="muted">Total somado das caixas registradoras e cofres da corporação</span>
              </div>
            </Card>

            <div className="readOnlyBanner">
              <ShieldAlert size={18} />
              <span>
                <strong>Acesso Informativo:</strong> Por segurança patrimonial, depósitos e saques devem ser efetuados presencialmente no cofre/caixa física na delegacia ou unidade.
              </span>
            </div>

            <div className="sectionTitle">
              <h3>Cofres Cadastrados</h3>
              <span>{registers.length} unidade(s)</span>
            </div>

            <div className="registerGrid">
              {registers.length === 0 ? (
                <div className="emptyState">Nenhum cofre físico registrado.</div>
              ) : (
                registers.map((r) => (
                  <div className="registerCard" key={r.id}>
                    <div className="registerCardInfo">
                      <b>{r.label}</b>
                      <small>{r.stationTitle || 'Estação Geral'}</small>
                    </div>
                    <span className="registerCardBalance">{money.format(r.balance)}</span>
                  </div>
                ))
              )}
            </div>

            <div className="sectionTitle" style={{ marginTop: 18 }}>
              <h3>Demonstrativo de Saldo Físico</h3>
              <span>Registros</span>
            </div>

            <div className="transactions">
              {transactions.map((t) => (
                <div key={t.id}>
                  <div className="txIcon in">
                    <CheckCircle />
                  </div>
                  <span>
                    <b>{t.title}</b>
                    <small>{t.date}</small>
                  </span>
                  <strong className="green">
                    {money.format(t.amount)}
                  </strong>
                </div>
              ))}
            </div>
          </main>
        )}

        {/* PERMISSIONS */}
        {page === 'permissions' && (
          <main>
            <div className="tabs">
              <button
                className={permTab === 'grade' ? 'active' : ''}
                onClick={() => setPermTab('grade')}
              >
                Por Cargo
              </button>
              <button
                className={permTab === 'individual' ? 'active' : ''}
                onClick={() => setPermTab('individual')}
              >
                Individual
              </button>
            </div>

            {permTab === 'grade' ? (
              <>
                <label>
                  Cargo Selecionado
                  <select
                    value={selectedPermGrade ?? (grades[0]?.level ?? 0)}
                    onChange={(e) => setSelectedPermGrade(Number(e.target.value))}
                  >
                    {grades.map((g) => (
                      <option key={g.level} value={g.level}>
                        {g.name} (Nível {g.level})
                      </option>
                    ))}
                  </select>
                </label>

                <Card>
                  <h3>Controle de Acessos</h3>
                  <p className="muted">Permissões padrão associadas a esta patente no aplicativo.</p>

                  {permItems.map((p) => {
                    const currentGrade = selectedPermGrade ?? (grades[0]?.level ?? 0);
                    const isEnabled = Boolean(data.permissions?.byGrade?.[String(currentGrade)]?.[p.id]);
                    return (
                      <div className="perm" key={p.id}>
                        <div className="permIcon">
                          <LockKeyhole />
                        </div>
                        <span>
                          <b>{p.name}</b>
                          <small>{p.description}</small>
                        </span>
                        <div
                          className={`toggle ${isEnabled ? 'on' : ''}`}
                          onClick={() => handleToggleGradePerm(p.id)}
                          title={isEnabled ? 'Clique para desativar' : 'Clique para ativar'}
                        >
                          <i />
                        </div>
                      </div>
                    );
                  })}
                </Card>
              </>
            ) : (
              <>
                <label>
                  Membro Selecionado
                  <select
                    value={selectedPermMemberCid}
                    onChange={(e) => setSelectedPermMemberCid(e.target.value)}
                  >
                    {members.map((m) => (
                      <option key={m.citizenid} value={m.citizenid}>
                        {m.name} ({m.grade} • Nível {m.level})
                      </option>
                    ))}
                  </select>
                </label>

                {(() => {
                  const member = members.find((m) => m.citizenid === selectedPermMemberCid);
                  const customPerms = selectedPermMemberCid ? (data.permissions?.byIndividual?.[selectedPermMemberCid] || {}) : {};
                  const hasCustom = Object.keys(customPerms).length > 0;
                  const memberGradeKey = String(member?.level ?? 0);
                  const gradePerms = data.permissions?.byGrade?.[memberGradeKey] || {};

                  return (
                    <>
                      {member && (
                        <div className="indivHeader">
                          <div className="indivInfo">
                            <div className="avatar">{member.initials}</div>
                            <div>
                              <b>{member.name}</b>
                              <small className="muted" style={{ display: 'block', fontSize: 10, marginTop: 2 }}>
                                {member.grade} • {hasCustom ? (
                                  <span className="badgeCustom">Personalizado</span>
                                ) : (
                                  <span className="badgeDefault">Padrão do Cargo</span>
                                )}
                              </small>
                            </div>
                          </div>
                          {hasCustom && (
                            <button
                              className="outline"
                              onClick={handleResetMemberPerms}
                              title="Restaurar permissões originais do cargo"
                              style={{ fontSize: 10, padding: '4px 8px' }}
                            >
                              Restaurar Padrão
                            </button>
                          )}
                        </div>
                      )}

                      <Card>
                        <h3>Permissões Individuais</h3>
                        <p className="muted">
                          {hasCustom
                            ? 'Este membro possui permissões específicas que sobrepõem as do cargo.'
                            : 'Herdando as permissões padrão do cargo. Clique em qualquer toggle para personalizar.'}
                        </p>

                        {permItems.map((p) => {
                          const isEnabled = customPerms[p.id] !== undefined
                            ? Boolean(customPerms[p.id])
                            : Boolean(gradePerms[p.id]);

                          return (
                            <div className="perm" key={p.id}>
                              <div className="permIcon">
                                <LockKeyhole />
                              </div>
                              <span>
                                <b>{p.name}</b>
                                <small>{p.description}</small>
                              </span>
                              <div
                                className={`toggle ${isEnabled ? 'on' : ''}`}
                                onClick={() => handleToggleMemberPerm(p.id)}
                                title={isEnabled ? 'Clique para desativar' : 'Clique para ativar'}
                              >
                                <i />
                              </div>
                            </div>
                          );
                        })}
                      </Card>
                    </>
                  );
                })()}
              </>
            )}
          </main>
        )}

        {/* MORE / SETTINGS DRAWER */}
        {page === 'settings' && (
          <main className="more">
            <button className="close" onClick={() => navigateTo('home')}>
              <X />
            </button>

            <div className="bigBrand">
              <ShieldCheck />
              <div>
                <b>FORGE</b>
                <small>MANAGEMENT</small>
              </div>
            </div>

            <h3>{org.label}</h3>
            <p className="green">● {org.playerGradeName}</p>

            <div className="menuList">
              <button onClick={() => navigateTo('home')}>
                <LayoutDashboard size={19} />
                Painel Principal
              </button>
              <button onClick={() => navigateTo('members')}>
                <Users size={19} />
                Membros da Equipe
              </button>
              {canViewCandidates && (
                <button onClick={() => navigateTo('candidates')}>
                  <FileText size={19} />
                  Candidaturas & Testes
                </button>
              )}
              {canManageMembers && (
                <button onClick={() => navigateTo('hire')}>
                  <UserPlus size={19} />
                  Contratar Cidadão
                </button>
              )}
              {canViewGrades && (
                <button onClick={() => navigateTo('grades')}>
                  <BriefcaseBusiness size={19} />
                  Cargos e Salários
                </button>
              )}
              {canViewFinance && (
                <button onClick={() => navigateTo('finance')}>
                  <BadgeDollarSign size={19} />
                  Cofre da Organização
                </button>
              )}
              {isBoss && (
                <button onClick={() => navigateTo('permissions')}>
                  <LockKeyhole size={19} />
                  Controle de Acesso
                </button>
              )}
            </div>

            <Card>
              <small className="muted">{org.motto}</small>
              <b>{org.label}</b>
            </Card>

            <div className="powered">
              <span>Powered by Forge Core</span>
              <span>v1.0.0</span>
            </div>
          </main>
        )}
      </div>

      {/* BOTTOM NAV */}
      {page !== 'settings' && <Bottom page={page} setPage={(p) => navigateTo(p)} canHire={canManageMembers} />}

      {/* MODAL: CHANGE GRADE */}
      {modalType === 'grade' && selectedMember && (
        <div className="modalBackdrop" onClick={() => setModalType(null)}>
          <div className="modalContent" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h3>Alterar Cargo de {selectedMember.name}</h3>
              <button className="modalClose" onClick={() => setModalType(null)}>
                <X size={18} />
              </button>
            </div>
            <label>
              Novo Cargo / Patente
              <select value={modalGrade} onChange={(e) => setModalGrade(Number(e.target.value))}>
                {sortedGrades
                  .filter((g) => isBoss || g.level < org.playerGradeLevel)
                  .map((g) => (
                    <option key={g.level} value={g.level}>
                      {g.name} (Nível {g.level})
                    </option>
                  ))}
              </select>
            </label>
            <div className="modalFooter">
              <button className="cancelBtn" onClick={() => setModalType(null)}>
                Cancelar
              </button>
              <button className="confirmBtn" onClick={() => handleChangeGrade(modalGrade)}>
                Salvar Cargo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: FIRE CONFIRMATION */}
      {modalType === 'fire' && selectedMember && (
        <div className="modalBackdrop" onClick={() => setModalType(null)}>
          <div className="modalContent" onClick={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <h3>Confirmar Demissão</h3>
              <button className="modalClose" onClick={() => setModalType(null)}>
                <X size={18} />
              </button>
            </div>
            <p className="muted" style={{ margin: 0, fontSize: 13 }}>
              Tem certeza que deseja demitir <b>{selectedMember.name}</b> da organização? Essa ação removerá o cargo
              e todas as permissões associadas.
            </p>
            <div className="modalFooter">
              <button className="cancelBtn" onClick={() => setModalType(null)}>
                Cancelar
              </button>
              <button className="dangerBtn" onClick={handleFireEmployee}>
                Demitir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
