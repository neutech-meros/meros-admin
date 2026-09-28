export type BusinessAccountRequestStatus = 'Pending' | 'More info' | 'Approved' | 'Rejected';

export interface BusinessAccountRequest {
  id: string;
  name: string;
  city: string;
  cnpj: string;
  category: string;
  requester: string;
  email: string;
  docs: string;
  submitted: string;
  status: BusinessAccountRequestStatus;
  plan: string;
  note: string;
  initials: string;
  avatarColor: string;
}

const AVATAR_COLORS = ['#7F00FF', '#1A8245', '#7C5CDF', '#B7791F', '#DF2339'];

function initialsOf(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

// Literal values ported from the BIZ array in Meros Admin (standalone).html.
const SEEDS: Array<Omit<BusinessAccountRequest, 'initials' | 'avatarColor'>> = [
  {
    id: 'br1',
    name: 'Pousada Vista Azul',
    city: 'Paraty, RJ',
    cnpj: '12.345.678/0001-90',
    category: 'Accommodation',
    requester: 'Marina Alves',
    email: 'marina@vistaazul.com.br',
    docs: '3 of 3',
    submitted: '24/08/2026',
    status: 'Pending',
    plan: 'Business Pro',
    note: 'Requested to sell hosted stays and list experiences.',
  },
  {
    id: 'br2',
    name: 'Trilhas do Sul Turismo',
    city: 'Gramado, RS',
    cnpj: '98.765.432/0001-21',
    category: 'Tour operator',
    requester: 'Diego Ramos',
    email: 'diego@trilhasdosul.com',
    docs: '2 of 3',
    submitted: '23/08/2026',
    status: 'Pending',
    plan: 'Business',
    note: 'Missing operating licence (Cadastur).',
  },
  {
    id: 'br3',
    name: 'Sabor da Ilha Restaurante',
    city: 'Florianópolis, SC',
    cnpj: '45.612.789/0001-33',
    category: 'Food & drink',
    requester: 'Carla Menezes',
    email: 'contato@sabordailha.com.br',
    docs: '3 of 3',
    submitted: '22/08/2026',
    status: 'Approved',
    plan: 'Business',
    note: 'Verified by the trust team.',
  },
  {
    id: 'br4',
    name: 'Rota Norte Transfers',
    city: 'Natal, RN',
    cnpj: '33.221.554/0001-77',
    category: 'Transport',
    requester: 'Fábio Lima',
    email: 'fabio@rotanorte.com',
    docs: '1 of 3',
    submitted: '21/08/2026',
    status: 'More info',
    plan: 'Business',
    note: 'Tax ID does not match the submitted company name.',
  },
  {
    id: 'br5',
    name: 'Casa Mar Aluguéis',
    city: 'Búzios, RJ',
    cnpj: '77.884.221/0001-05',
    category: 'Accommodation',
    requester: 'Renata Pires',
    email: 'renata@casamar.com.br',
    docs: '3 of 3',
    submitted: '19/08/2026',
    status: 'Rejected',
    plan: 'Business Pro',
    note: 'Duplicate of an existing business account.',
  },
  {
    id: 'br6',
    name: 'Serra Bike Experience',
    city: 'Campos do Jordão, SP',
    cnpj: '10.559.334/0001-18',
    category: 'Experiences',
    requester: 'Thiago Costa',
    email: 'thiago@serrabike.com',
    docs: '3 of 3',
    submitted: '18/08/2026',
    status: 'Approved',
    plan: 'Business',
    note: 'Approved with commission tier 12%.',
  },
];

export function getBusinessAccountRequests(): BusinessAccountRequest[] {
  return SEEDS.map((r, i) => ({
    ...r,
    initials: initialsOf(r.name),
    avatarColor: AVATAR_COLORS[i % AVATAR_COLORS.length],
  }));
}
