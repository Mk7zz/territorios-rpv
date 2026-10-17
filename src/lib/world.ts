/**
 * Mapa do mundo 2D (a "base" do aluno). Coordenadas em pixels lógicos de um mundo de 320×180.
 * x/y é a porta de cada lugar: onde o personagem para para entrar. Para outra instância
 * (white label), basta renomear, mover ou trocar as rotas aqui.
 */
export type PlaceKind = 'house' | 'tower' | 'board' | 'fountain' | 'post' | 'hall' | 'arena' | 'stage' | 'church' | 'mestre' | 'bridge' | 'museum' | 'station' | 'chacara' | 'cultural' | 'memorial' | 'painel' | 'hotel';

/** Mestre do Saber: personagem da cultura popular que mora numa casinha do mapa e conversa com a criança. */
export interface Master {
  name: string;
  /** Do que ele é mestre (aparece na plaquinha do nome). */
  craft: string;
  /** Nome do cômodo onde ele recebe a criança (título da tela da casa). */
  room: string;
  /** Cor do mestre (plaquinha, balões e caixa de curiosidade) e a versão clarinha dela. */
  color: string;
  soft: string;
  /** O que ele diz quando a criança entra: de quem é a casa e o convite para jogar. */
  enter: string;
  /** Reações no balão logo depois da resposta (sorteadas). */
  right: string[];
  wrong: string[];
  /** Títulos da janelinha de resultado (sorteados). */
  win: string[];
  oops: string[];
  /** Como ele apresenta a curiosidade na janelinha (ex.: "Escuta o Seu Zico:"). */
  tell: string;
  /** Frases curtas que aparecem no balão quando ele está parado na porta. */
  greetings: string[];
}

export interface Place {
  id: string;
  label: string;
  hint: string;
  to: string;
  icon: string;
  kind: PlaceKind;
  x: number;
  y: number;
  /** Largura da construção (apenas casas). */
  w?: number;
  roof?: string;
  wall?: string;
  /** Lugar ainda não liberado (mostra um cadeado e não abre). */
  soon?: boolean;
  /** Casa de um Mestre do Saber (com o personagem na porta). */
  master?: Master;
  /** Estilo da construção quando há mais de um desenho para o mesmo tipo (casas dos mestres). */
  variant?: 'roca' | 'hiphop' | 'bordado';
}

export const WORLD_W = 320;
export const WORLD_H = 180;

export const PLACES: Place[] = [
  { id: 'academia', label: 'Academia', hint: 'Cursos e trilhas', to: '/cursos', icon: 'books', kind: 'house', x: 78, y: 84, w: 46, roof: '#12a3a0', wall: '#f1e6cf' },
  { id: 'torre', label: 'Torre do Mapa', hint: 'Mapa do Vale', to: '/jornada', icon: 'map', kind: 'tower', x: 150, y: 76, roof: '#1f7a4d' },
  { id: 'quadro', label: 'Quadro de Missões', hint: 'Missões diárias e semanais', to: '/missoes', icon: 'target', kind: 'board', x: 212, y: 98 },
  { id: 'feira', label: 'Feira de Talentos', hint: 'Oportunidades das empresas parceiras', to: '/oportunidades', icon: 'briefcase', kind: 'house', x: 24, y: 96, w: 30, roof: '#23384a', wall: '#e9eef2' },
  { id: 'casa', label: 'Sua casa', hint: 'Perfil, medalhas e avatar', to: '/perfil', icon: 'home', kind: 'house', x: 36, y: 142, w: 32, roof: '#d64545', wall: '#f4ead8' },
  { id: 'praca', label: 'Praça das Conexões', hint: 'Amigos e comparações', to: '/conexoes', icon: 'users', kind: 'fountain', x: 150, y: 134 },
  { id: 'correio', label: 'Correio', hint: 'Mensagens', to: '/mensagens', icon: 'mail', kind: 'post', x: 96, y: 164, roof: '#e8772e' },
  { id: 'salao', label: 'Salão dos Troféus', hint: 'Certificados', to: '/certificados', icon: 'trophy', kind: 'hall', x: 206, y: 164, roof: '#f2b705' },
  { id: 'arena', label: 'Arena', hint: 'Ranking', to: '/ranking', icon: 'crown', kind: 'arena', x: 294, y: 94 },
  { id: 'palco', label: 'Palco', hint: 'Eventos', to: '/eventos', icon: 'calendar', kind: 'stage', x: 292, y: 164 },
];

/** Caminho principal (leste-oeste) e ponte sobre o rio. */
export const MAIN_PATH = { y: 122, h: 8 };
export const SPAWN = { x: 150, y: 150 };
export const BOUNDS = { x0: 8, x1: 312, y0: 52, y1: 176 };

export const riverX = (y: number) => 252 + Math.round(Math.sin(y / 16) * 3);
export const RIVER_HALF = 6;
export const BRIDGE = { y0: MAIN_PATH.y - 3, y1: MAIN_PATH.y + MAIN_PATH.h + 2 };

/*
 * Mapa do Territórios: maior que a base do Multiverso (que continua com as medidas acima), para os
 * pontos focais terem espaço entre si. Os desenhos têm o mesmo tamanho; o que cresce é o terreno.
 */
export const CITY_W = 400;
export const CITY_H = 225;
export const CITY_PATH = { y: 142, h: 8 };
export const CITY_BOUNDS = { x0: 8, x1: CITY_W - 8, y0: 52, y1: CITY_H - 4 };
/** Praça do chafariz, logo abaixo do caminho principal; a criança começa na frente dela. */
export const PLAZA = { x: 200, y: 168 };
export const CITY_SPAWN = { x: PLAZA.x, y: PLAZA.y + 22 };
export const cityRiverX = (y: number) => 302 + Math.round(Math.sin(y / 16) * 3);
export const CITY_BRIDGE = { y0: CITY_PATH.y - 3, y1: CITY_PATH.y + CITY_PATH.h + 2 };

export function inCityRiver(x: number, y: number) {
  if (y >= CITY_BRIDGE.y0 && y <= CITY_BRIDGE.y1) return false;
  return Math.abs(x - cityRiverX(y)) < RIVER_HALF + 2;
}

export function inRiver(x: number, y: number) {
  if (y >= BRIDGE.y0 && y <= BRIDGE.y1) return false;
  return Math.abs(x - riverX(y)) < RIVER_HALF + 2;
}
