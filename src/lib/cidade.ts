/**
 * Cataguases para crianças: os pontos turísticos do mapa, as perguntas de cada lugar e a
 * pontuação guardada no próprio navegador (não precisa de login).
 * Para liberar um lugar novo: troque o item "Em breve" por um lugar com `kind`/`to` próprios
 * e cadastre as perguntas dele em QUESTIONS.
 */
import { heroGender } from './personagem';
import type { Clip } from './vozes';
import { CITY_BRIDGE, CITY_PATH, cityRiverX, PLACES, PLAZA, type Place } from './world';

export interface Option {
  text: string;
  /** Figura de apoio para quem ainda está aprendendo a ler. */
  emoji: string;
}

export interface Question {
  id: string;
  text: string;
  /** Provocação do Mestre do Saber que já termina com a pergunta: é ela que ele fala em voz alta (só nas casas dos mestres). */
  hook?: string;
  /** A primeira opção é sempre a certa; a ordem é embaralhada na tela. */
  options: [Option, Option, Option];
  /** Curiosidade mostrada depois do acerto. */
  fact: string;
}

export interface CityPlace extends Place {
  /** Nome falado/curto do lugar, usado nas falas da pomba. */
  title: string;
  intro: string;
}

const SANTA_RITA: CityPlace = {
  id: 'santa-rita',
  label: 'Praça Santa Rita',
  title: 'Praça Santa Rita',
  hint: 'Toque para visitar!',
  intro: 'Chegamos na Praça Santa Rita! Olha que igreja bonita. Vamos ver se você sabe a resposta?',
  to: '/lugar/santa-rita',
  icon: 'bell',
  kind: 'church',
  x: 104,
  y: 106,
};

/*
 * Pontos focais de Cataguases: cada um tem a sua cena (pages/cidade) e as suas perguntas.
 * - Ponte Metálica ("Ponte Velha"): é a própria ponte do mapa sobre o Rio Pomba.
 * - Museu Energisa: casarão art nouveau perto do rio, com a história da energia elétrica.
 * - Estação Cataguases: a estação de trem de tijolinho, do outro lado do rio.
 * - Chácara Dona Catarina: a casa laranja com renda branca no telhado e o jardim com laguinho.
 * - Centro Cultural Humberto Mauro: o prédio pequeno da placa vermelha, com galeria, teatro e cinema.
 * - Memorial Nanzita (hoje Sicoob): casa moderna com a fileira de janelas e o grande painel de azulejos.
 * - Painel do Educandário: o muro de azulejos azuis com pombas brancas, na Praça Santa Rita
 *   (no mapa, embaixo da praça do chafariz). A cena é a calçada da praça na frente do painel.
 * - Prédio Sicredi: o sobrado verde que foi o Grande Hotel Villas (arcos, base de pedra e ameias).
 *   O Sicredi é patrocinador: no mapa ele fica em destaque, maior, no canto de cima à direita.
 */
const PONTE: CityPlace = {
  id: 'ponte',
  label: 'Ponte Metálica',
  title: 'Ponte Metálica',
  hint: 'A Ponte Velha sobre o Rio Pomba',
  intro: 'Chegamos na Ponte Metálica, a Ponte Velha! Ela atravessa o Rio Pomba desde 1915.',
  to: '/lugar/ponte',
  icon: 'map',
  kind: 'bridge',
  x: cityRiverX(CITY_PATH.y + 4),
  y: CITY_BRIDGE.y0,
};

const MUSEU: CityPlace = {
  id: 'museu',
  label: 'Museu Energisa',
  title: 'Museu Energisa',
  hint: 'A história da energia elétrica',
  intro: 'Chegamos no Museu Energisa! Aqui mora a história da energia elétrica de Cataguases.',
  to: '/lugar/museu',
  icon: 'star',
  kind: 'museum',
  x: 258,
  y: 108,
};

const ESTACAO: CityPlace = {
  id: 'estacao',
  label: 'Estação Cataguases',
  title: 'Estação Cataguases',
  hint: 'A estação de trem',
  intro: 'Chegamos na Estação Cataguases! Olha o trem chegando.',
  to: '/lugar/estacao',
  icon: 'flag',
  kind: 'station',
  x: 356,
  y: 206,
};

const CHACARA: CityPlace = {
  id: 'chacara',
  label: 'Chácara Dona Catarina',
  title: 'Chácara Dona Catarina',
  hint: 'A casa laranja do jardim',
  intro: 'Chegamos na Chácara Dona Catarina! Que jardim bonito.',
  to: '/lugar/chacara',
  icon: 'heart',
  kind: 'chacara',
  x: 34,
  y: 106,
};

const CULTURAL: CityPlace = {
  id: 'cultural',
  label: 'Centro Cultural Humberto Mauro',
  title: 'Centro Cultural Humberto Mauro',
  hint: 'Arte, teatro e cinema',
  intro: 'Chegamos no Centro Cultural Humberto Mauro! Aqui tem arte, teatro e cinema.',
  to: '/lugar/cultural',
  icon: 'palette',
  kind: 'cultural',
  x: 196,
  y: 104,
};

const NANZITA: CityPlace = {
  id: 'nanzita',
  label: 'Memorial Nanzita',
  title: 'Memorial Nanzita',
  hint: 'A casa do painel colorido',
  intro: 'Chegamos no Memorial Nanzita! Olha que painel colorido.',
  to: '/lugar/nanzita',
  icon: 'palette',
  kind: 'memorial',
  x: 160,
  y: 136,
};

const EDUCANDARIO: CityPlace = {
  id: 'educandario',
  label: 'Painel do Educandário',
  title: 'Painel do Educandário',
  hint: 'O muro das pombas azuis',
  intro: 'Chegamos no Painel do Educandário! Olha quantas pombas.',
  to: '/lugar/educandario',
  icon: 'school',
  kind: 'painel',
  x: 200,
  y: 216,
};

const SICREDI: CityPlace = {
  id: 'sicredi',
  label: 'Prédio Sicredi',
  title: 'Prédio Sicredi',
  hint: 'O prédio verde que já foi hotel',
  intro: 'Chegamos no Prédio Sicredi! Ele já foi um hotel.',
  to: '/lugar/sicredi',
  icon: 'building',
  kind: 'hotel',
  x: 356,
  y: 112,
};

const LANDMARKS = [SANTA_RITA, PONTE, MUSEU, ESTACAO, CHACARA, CULTURAL, NANZITA, EDUCANDARIO, SICREDI];

/*
 * Mestres do Saber: pessoas da cultura popular que guardam histórias, músicas e costumes.
 * Cada um mora numa casinha da "Rua dos Mestres" (embaixo, no mapa) e recebe a criança
 * dentro de casa, com perguntas. Os visuais são provisórios: trocar quando a equipe definir
 * as características de cada mestre.
 *
 * Falas: escritas para quem ainda está aprendendo a ler. Frases curtas, palavras do dia a dia
 * e o jeitinho mineiro de cada um (o "uai", o "sô", o "trem bão"), sem exagerar no sotaque.
 * São poucas de propósito: crianças gravam as vozes (veja lib/vozes.ts). Cada mestre tem uma
 * entrada, um acerto, um erro e três perguntas (o Sektor tem mais porque já foi gravado).
 * Toda curiosidade diz a resposta certa, porque ela é a única coisa falada depois de um erro.
 * - Seu Zico: roceiro contador de causo, calmo e brincalhão.
 *   Recebe com "Ô de fora!", a resposta mineira ao "Ô de casa!".
 * - Sektor: MC e b-boy de Cataguases. Fala no ritmo, solta umas rimas e usa gíria leve.
 * - Dona Rosa: avó bordadeira, carinhosa ("minha flor", "meu anjo"). Tem o gato Novelo.
 * Os emojis aparecem na tela como apoio visual; a voz pula eles.
 */
const SEU_ZICO: Place = {
  id: 'seu-zico',
  label: 'Casa do Seu Zico',
  hint: 'Converse com o Mestre do Saber',
  to: '/mestre/seu-zico',
  icon: 'scroll',
  kind: 'mestre',
  variant: 'roca',
  x: 40,
  y: 206,
  wall: '#f4a3c4',
  roof: '#c4553a',
  master: {
    name: 'Seu Zico',
    craft: 'Mestre do Saber · Causos e costumes',
    room: 'Cozinha do Seu Zico',
    color: '#d6538a',
    soft: '#ffe1ec',
    enter: 'Ô de fora! Essa é a casa do Seu Zico. Bora jogar? 🏡',
    right: ['Ô trem bão! Acertou! 🎉'],
    wrong: ['Uai, quase! Escuta só.'],
    win: ['Ô trem bão!', 'Acertou, sô!', 'Nó, que beleza!'],
    oops: ['Quase, sô! 💪', 'Não foi dessa vez! 💪'],
    tell: 'Escuta o Seu Zico:',
    greetings: ['Ô de fora! Pode chegar! 👋', 'Vem prosear! ☕', 'Tem pão de queijo! 🧀', 'Quer ouvir um causo? 📜', 'Cadê a Pipoca? 🐶', 'Uai, sô! 😄'],
  },
};

const SEKTOR: Place = {
  id: 'sektor',
  label: 'Casa do Sektor',
  hint: 'Conheça o Mestre do Saber do Hip Hop',
  to: '/mestre/sektor',
  icon: 'play',
  kind: 'mestre',
  variant: 'hiphop',
  x: 112,
  y: 212,
  master: {
    name: 'Sektor',
    craft: 'Mestre do Saber · Hip Hop',
    room: 'Estúdio do Sektor',
    color: '#6b4fa0',
    soft: '#ece4fb',
    enter: 'Oi! Você entrou no estúdio do Sektor. Bora pro desafio? 🎧',
    right: ['Acertou na batida, resposta garantida! 🎤', 'É nóis! Cê manja muito!'],
    wrong: ['Errar faz parte do rolê. Bora aprender!', 'Sem estresse! Se liga que eu te explico.'],
    win: ['É nóis!', 'Mandou bem!', 'Acertou na batida!'],
    oops: ['Quase! Bora de novo 💪', 'Faz parte do rolê! 💪'],
    tell: 'Papo reto do Sektor:',
    greetings: ['Oi! ✌️', 'Chega mais! 🎧', 'Bora dançar? 🕺', 'Tá no ritmo? 🎵', 'Solta o som! 🔊', 'É nóis! 🤙'],
  },
};

const DONA_ROSA: Place = {
  id: 'dona-rosa',
  label: 'Casa da Dona Rosa',
  hint: 'Conheça a Mestre do Saber do bordado',
  to: '/mestre/dona-rosa',
  icon: 'heart',
  kind: 'mestre',
  variant: 'bordado',
  x: 270,
  y: 212,
  wall: '#f6dc8a',
  roof: '#b5523b',
  master: {
    name: 'Dona Rosa',
    craft: 'Mestre do Saber · Bordado',
    room: 'Ateliê da Dona Rosa',
    color: '#12a3a0',
    soft: '#e2f6f5',
    enter: 'Oi, minha flor! Essa é a casa da Dona Rosa. Vamos brincar? 🌸',
    right: ['Muito bem, minha flor! 💛'],
    wrong: ['Quase, meu anjo! Escuta só.'],
    win: ['Que capricho!', 'Muito bem!', 'Que orgulho!'],
    oops: ['Quase, meu anjo! 💪', 'Devagarinho se aprende! 💪'],
    tell: 'A Dona Rosa ensina:',
    greetings: ['Entra, minha flor! 🌸', 'Vem bordar comigo! 🧵', 'Aceita um biscoitinho? 🍪', 'Um ponto de cada vez 💛', 'Cadê o Novelo? 🐱', 'Que dia bonito, uai! ☀️'],
  },
};

const MASTERS = [SEU_ZICO, SEKTOR, DONA_ROSA];

/** Os demais lugares do mapa ficam com cadeado até ganharem desenho e perguntas. */
export const CITY_PLACES: Place[] = [
  ...LANDMARKS,
  ...MASTERS,
  ...PLACES.filter((p) => !['academia', 'casa', 'correio', 'salao', 'quadro', 'arena', 'feira', 'torre', 'palco'].includes(p.id)).map((p) => ({ ...p, ...(p.id === 'praca' ? { x: PLAZA.x, y: PLAZA.y + 4 } : {}), label: 'Em breve', hint: 'Este lugar ainda está em construção', soon: true })),
];

export const CITY_INFO: Record<string, CityPlace> = Object.fromEntries(LANDMARKS.map((p) => [p.id, p]));

/** Casas dos Mestres do Saber que já podem ser visitadas. */
export const MASTER_PLACES: Record<string, Place> = Object.fromEntries(MASTERS.map((m) => [m.id, m]));

// Textos provisórios: revisar com a equipe pedagógica antes de publicar.
// Curtos de propósito: tudo que é falado é gravado por crianças (veja lib/vozes.ts).
export const QUESTIONS: Record<string, Question[]> = {
  sektor: [
    {
      id: 'elementos',
      hook: 'O Hip Hop tem uns elementos que andam sempre juntos. Sabe um deles?',
      text: 'Qual destes é um elemento do Hip Hop?',
      options: [
        { text: 'Breaking, a dança', emoji: '🕺' },
        { text: 'Balé', emoji: '🩰' },
        { text: 'Futebol', emoji: '⚽' },
      ],
      fact: 'O Hip Hop tem DJ, MC, breaking e grafite. E o quinto elemento: o conhecimento!',
    },
    {
      id: 'grafite',
      hook: 'Olha esse muro colorido atrás de mim! Sabe o que é o grafite?',
      text: 'O que é o grafite do Hip Hop?',
      options: [
        { text: 'Arte pintada nos muros', emoji: '🎨' },
        { text: 'Um bichinho de jardim', emoji: '🐛' },
        { text: 'Um tipo de sorvete', emoji: '🍦' },
      ],
      fact: 'Grafite é arte pintada no muro! Mas antes tem que pedir licença pro dono do muro.',
    },
    {
      id: 'origem',
      hook: 'O Hip Hop rodou o mundo até chegar aqui. Sabe onde ele nasceu?',
      text: 'Onde o Hip Hop nasceu?',
      options: [
        { text: 'Nos bairros de Nova York', emoji: '🗽' },
        { text: 'No fundo do mar', emoji: '🐠' },
        { text: 'Na Lua', emoji: '🌙' },
      ],
      fact: 'Nasceu em Nova York, nas festas de rua, lá nos anos 1970. Depois chegou no Brasil!',
    },
    {
      id: 'freeze',
      hook: 'No breaking tem um passo em que a gente fica paradinho, igual estátua. Qual é?',
      text: 'Qual destes é um passo do breaking?',
      options: [
        { text: 'Freeze: congelar numa pose', emoji: '🧊' },
        { text: 'Embaixadinha', emoji: '⚽' },
        { text: 'Nado borboleta', emoji: '🏊' },
      ],
      fact: 'É o freeze: congelar numa pose! O breaking já foi até esporte nas Olimpíadas.',
    },
  ],
  'dona-rosa': [
    {
      id: 'agulha',
      hook: 'Pra bordar, a gente usa o quê?',
      text: 'Com o que a gente borda?',
      options: [
        { text: 'Agulha e linha', emoji: '🪡' },
        { text: 'Martelo e prego', emoji: '🔨' },
        { text: 'Garfo e faca', emoji: '🍴' },
      ],
      fact: 'Agulha e linha! Cada furinho vira um pontinho.',
    },
    {
      id: 'ponto-cruz',
      hook: 'Tem um ponto feito de xizinhos. Qual é?',
      text: 'Qual é o nome de um ponto de bordado?',
      options: [
        { text: 'Ponto cruz', emoji: '❌' },
        { text: 'Ponto de ônibus', emoji: '🚌' },
        { text: 'Ponto de exclamação', emoji: '❗' },
      ],
      fact: 'Ponto cruz! Feito de xizinhos.',
    },
    {
      id: 'aprender',
      hook: 'Como será que eu aprendi a bordar?',
      text: 'Como se aprende a bordar?',
      options: [
        { text: 'Com alguém que já sabe', emoji: '👵' },
        { text: 'Dormindo', emoji: '😴' },
        { text: 'Correndo', emoji: '🏃' },
      ],
      fact: 'Com quem já sabe! Eu aprendi com a minha avó.',
    },
  ],
  'seu-zico': [
    {
      id: 'causo',
      hook: 'Cê sabe o que é um causo?',
      text: 'O que é um causo?',
      options: [
        { text: 'Uma história contada de boca em boca', emoji: '🗣️' },
        { text: 'Um tipo de doce', emoji: '🍬' },
        { text: 'Uma pipa', emoji: '🪁' },
      ],
      fact: 'É uma história contada de boca em boca!',
    },
    {
      id: 'rio-pomba',
      hook: 'Que rio passa aqui em Cataguases?',
      text: 'Qual rio passa por Cataguases?',
      options: [
        { text: 'Rio Pomba', emoji: '🏞️' },
        { text: 'Rio Amazonas', emoji: '🐊' },
        { text: 'Rio Nilo', emoji: '🐫' },
      ],
      fact: 'O Rio Pomba! Eu pescava lambari nele.',
    },
    {
      id: 'pao-de-queijo',
      hook: 'Que cheirinho bom! Adivinha o que é?',
      text: 'Qual é a quitanda mais famosa de Minas Gerais?',
      options: [
        { text: 'Pão de queijo', emoji: '🧀' },
        { text: 'Sushi', emoji: '🍣' },
        { text: 'Taco', emoji: '🌮' },
      ],
      fact: 'Pão de queijo, uai! O orgulho de Minas.',
    },
  ],
  ponte: [
    {
      id: 'historia',
      text: 'Por que a Ponte Metálica de Cataguases é considerada importante para a história da cidade?',
      options: [
        { text: 'Porque ela ajudou a ligar diferentes partes da cidade, facilitando a passagem de pessoas e mercadorias e contribuindo para o desenvolvimento de Cataguases.', emoji: '🌉' },
        { text: 'Porque ela foi feita só para enfeitar o rio e ninguém nunca passou por ela.', emoji: '🎀' },
        { text: 'Porque era lá que as crianças da cidade guardavam os seus brinquedos.', emoji: '🧸' },
      ],
      fact: 'Porque ela ajudou a ligar diferentes partes da cidade, facilitando a passagem de pessoas e mercadorias e contribuindo para o desenvolvimento de Cataguases.',
    },
    {
      id: 'mudou',
      text: 'O que mudou na vida das pessoas depois da construção da Ponte Metálica?',
      options: [
        { text: 'Ficou mais fácil de viajar, trabalhar e estudar.', emoji: '🚶' },
        { text: 'As pessoas pararam de sair de casa.', emoji: '🏠' },
        { text: 'O rio secou e virou uma estrada.', emoji: '🏜️' },
      ],
      fact: 'Ficou mais fácil de viajar, trabalhar e estudar.',
    },
  ],
  museu: [
    {
      id: 'historia',
      text: 'Por que é importante conhecer a história da eletricidade em Cataguases?',
      options: [
        { text: 'Porque entendemos como as invenções e os conhecimentos ajudaram a transformar a vida das pessoas.', emoji: '💡' },
        { text: 'Porque assim a gente nunca mais vai precisar usar energia.', emoji: '🔌' },
        { text: 'Porque a eletricidade só existe dentro do museu.', emoji: '🏛️' },
      ],
      fact: 'Porque entendemos como as invenções e os conhecimentos ajudaram a transformar a vida das pessoas.',
    },
    {
      id: 'energia',
      text: 'Como a chegada da energia elétrica ajudou as pessoas de Cataguases no dia a dia?',
      options: [
        { text: 'A energia elétrica permitiu iluminar casas e ruas, além de ajudar no funcionamento de máquinas, escolas, comércios e fábricas, tornando a vida das pessoas mais fácil e segura.', emoji: '⚡' },
        { text: 'A energia elétrica deixou as ruas mais escuras e fez as fábricas pararem de funcionar.', emoji: '🌑' },
        { text: 'A energia elétrica serviu só para acender as luzinhas da árvore de Natal.', emoji: '🎄' },
      ],
      fact: 'A energia elétrica permitiu iluminar casas e ruas, além de ajudar no funcionamento de máquinas, escolas, comércios e fábricas, tornando a vida das pessoas mais fácil e segura.',
    },
  ],
  estacao: [
    {
      id: 'aprender',
      text: 'O que podemos aprender ao conhecer a história da Estação Ferroviária de Cataguases?',
      options: [
        { text: 'Podemos entender como o trem ajudou no desenvolvimento da cidade.', emoji: '🏙️' },
        { text: 'Podemos aprender a pilotar um avião.', emoji: '✈️' },
        { text: 'Podemos descobrir como os peixes vivem no fundo do mar.', emoji: '🐟' },
      ],
      fact: 'Podemos entender como o trem ajudou no desenvolvimento da cidade.',
    },
    {
      id: 'culturas',
      text: 'Como a estação ajudou as pessoas a conhecerem novas culturas e costumes?',
      options: [
        { text: 'Porque permitiu a chegada e a saída de pessoas, favorecendo a troca de experiências, ideias e tradições.', emoji: '🚂' },
        { text: 'Porque as pessoas ficavam paradas na estação sem conversar com ninguém.', emoji: '🤐' },
        { text: 'Porque o trem só levava caixas e nunca levava pessoas.', emoji: '📦' },
      ],
      fact: 'Porque permitiu a chegada e a saída de pessoas, favorecendo a troca de experiências, ideias e tradições.',
    },
  ],
  chacara: [
    {
      id: 'especial',
      text: 'Por que a Chácara Catarina é um lugar especial para a cidade?',
      options: [
        { text: 'Porque guarda histórias antigas, mostra tradições e é um espaço de encontro para aprender e brincar.', emoji: '🏡' },
        { text: 'Porque é uma loja que vende roupas e sapatos novos.', emoji: '👕' },
        { text: 'Porque é o lugar onde os carros da cidade ficam estacionados.', emoji: '🚗' },
      ],
      fact: 'Porque guarda histórias antigas, mostra tradições e é um espaço de encontro para aprender e brincar.',
    },
    {
      id: 'preservar',
      text: 'Como a Chácara Catarina ajuda a preservar a história da cidade?',
      options: [
        { text: 'Guardando memórias, objetos antigos e mostrando como as pessoas viviam no passado.', emoji: '📜' },
        { text: 'Jogando fora tudo o que é velho e antigo.', emoji: '🗑️' },
        { text: 'Trocando as casas antigas por prédios novos.', emoji: '🏗️' },
      ],
      fact: 'Guardando memórias, objetos antigos e mostrando como as pessoas viviam no passado.',
    },
  ],
  cultural: [
    {
      id: 'aprender',
      text: 'O que as crianças podem aprender ao visitar o Centro Cultural Humberto Mauro?',
      options: [
        { text: 'Elas podem aprender sobre cinema, arte, história e a importância da cultura para a comunidade.', emoji: '🎭' },
        { text: 'Elas podem aprender a consertar carros e motos.', emoji: '🔧' },
        { text: 'Elas aprendem só a fazer bolos e doces para vender.', emoji: '🎂' },
      ],
      fact: 'Elas podem aprender sobre cinema, arte, história e a importância da cultura para a comunidade.',
    },
    {
      id: 'cinema',
      text: 'O que o Humberto Mauro nos ensina sobre o cinema?',
      options: [
        { text: 'O cinema ajuda a contar histórias, preservar memórias e levar a cultura de um povo para todo o mundo!', emoji: '🎬' },
        { text: 'Que o cinema serve só para comer pipoca no escuro.', emoji: '🍿' },
        { text: 'Que os filmes devem ser vistos escondidos, por uma pessoa só.', emoji: '🙈' },
      ],
      fact: 'O cinema ajuda a contar histórias, preservar memórias e levar a cultura de um povo para todo o mundo!',
    },
  ],
  nanzita: [
    {
      id: 'painel',
      text: 'O que tem na parede de baixo da casa?',
      options: [
        { text: 'Um painel colorido', emoji: '🎨' },
        { text: 'Uma piscina', emoji: '🏊' },
        { text: 'Um foguete', emoji: '🚀' },
      ],
      fact: 'Um painel enorme, feito de azulejos!',
    },
    {
      id: 'burro',
      text: 'Que bicho aparece no painel?',
      options: [
        { text: 'Um burrinho', emoji: '🐴' },
        { text: 'Um tubarão', emoji: '🦈' },
        { text: 'Um pinguim', emoji: '🐧' },
      ],
      fact: 'Um burrinho, carregando a carga nas costas!',
    },
    {
      id: 'artista',
      text: 'Quem morava nesta casa?',
      options: [
        { text: 'Uma artista', emoji: '🎨' },
        { text: 'Um pirata', emoji: '🏴‍☠️' },
        { text: 'Um astronauta', emoji: '🧑‍🚀' },
      ],
      fact: 'A artista Nanzita! Hoje a casa guarda a arte dela.',
    },
  ],
  educandario: [
    {
      id: 'pombas',
      text: 'Que bicho voa no painel?',
      options: [
        { text: 'Pombas', emoji: '🕊️' },
        { text: 'Peixes', emoji: '🐟' },
        { text: 'Gatos', emoji: '🐱' },
      ],
      fact: 'Pombas! Brancas e azuis, voando juntas.',
    },
    {
      id: 'azulejo',
      text: 'Do que é feito o painel?',
      options: [
        { text: 'De azulejos', emoji: '🟦' },
        { text: 'De papel', emoji: '📄' },
        { text: 'De madeira', emoji: '🪵' },
      ],
      fact: 'De azulejos! Cada quadradinho foi pintado.',
    },
    {
      id: 'parede',
      text: 'Onde esta obra de arte foi feita?',
      options: [
        { text: 'Na parede', emoji: '🧱' },
        { text: 'No ônibus', emoji: '🚌' },
        { text: 'No céu', emoji: '☁️' },
      ],
      fact: 'Na parede! A arte faz parte do prédio.',
    },
  ],
  sicredi: [
    {
      id: 'hotel',
      text: 'Hoje é o Sicredi. E antes, o que era?',
      options: [
        { text: 'Um hotel', emoji: '🏨' },
        { text: 'Um navio', emoji: '🚢' },
        { text: 'Um circo', emoji: '🎪' },
      ],
      fact: 'Um hotel! O Grande Hotel Villas.',
    },
    {
      id: 'cor',
      text: 'Qual é a cor do prédio?',
      options: [
        { text: 'Verde', emoji: '💚' },
        { text: 'Roxo', emoji: '💜' },
        { text: 'Laranja', emoji: '🧡' },
      ],
      fact: 'Verde, com enfeites brancos!',
    },
    {
      id: 'centro',
      text: 'Onde fica o prédio do Sicredi?',
      options: [
        { text: 'No centro da cidade', emoji: '🏙️' },
        { text: 'No meio do mar', emoji: '🌊' },
        { text: 'Na Lua', emoji: '🌙' },
      ],
      fact: 'No centro da cidade! Todo mundo repara nele.',
    },
  ],
  'santa-rita': [
    {
      id: 'nome-praca',
      text: 'Qual é o nome desta praça?',
      options: [
        { text: 'Santa Rita', emoji: '🌹' },
        { text: 'São João', emoji: '🔥' },
        { text: 'Santa Luzia', emoji: '🕯️' },
      ],
      fact: 'Santa Rita! A santa das rosas.',
    },
    {
      id: 'torre-cruz',
      text: 'O que tem no alto da torre?',
      options: [
        { text: 'Uma cruz', emoji: '✝️' },
        { text: 'Uma estrela', emoji: '⭐' },
        { text: 'Um balão', emoji: '🎈' },
      ],
      fact: 'Uma cruz! E lá dentro mora o sino.',
    },
    {
      id: 'encontro',
      text: 'O povo vem na praça pra fazer o quê?',
      options: [
        { text: 'Encontrar os amigos', emoji: '🤝' },
        { text: 'Dormir', emoji: '😴' },
        { text: 'Tomar banho', emoji: '🛁' },
      ],
      fact: 'Encontrar os amigos! A praça é o coração da cidade.',
    },
  ],
};

/* ---- Progresso no navegador ---- */

const KEY = 'cidade:progresso';

interface Progress {
  points: number;
  /** Perguntas já vistas por lugar (zera quando todas forem vistas). */
  seen: Record<string, string[]>;
}

function load(): Progress {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? 'null');
    if (raw && typeof raw.points === 'number') return { points: raw.points, seen: raw.seen ?? {} };
  } catch {
    /* sem armazenamento: começa do zero */
  }
  return { points: 0, seen: {} };
}

function save(p: Progress) {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    /* ignorado */
  }
}

export function getPoints() {
  return load().points;
}

export function addPoints(n: number) {
  const p = load();
  p.points += n;
  save(p);
  return p.points;
}

/** Próxima pergunta ainda não vista do lugar (sem gravar nada; repetível). */
export function nextQuestion(placeId: string, avoid?: string): Question | null {
  const list = QUESTIONS[placeId] ?? [];
  if (!list.length) return null;
  const seen = load().seen[placeId] ?? [];
  const fresh = list.filter((q) => !seen.includes(q.id) && q.id !== avoid);
  const pool = fresh.length ? fresh : list.filter((q) => q.id !== avoid);
  return pool[Math.floor(Math.random() * pool.length)] ?? list[0];
}

/** Marca a pergunta como vista. Idempotente; quando todas foram vistas, recomeça o ciclo. */
export function markSeen(placeId: string, questionId: string) {
  const p = load();
  const total = QUESTIONS[placeId]?.length ?? 0;
  let seen = p.seen[placeId] ?? [];
  if (seen.includes(questionId)) return;
  if (seen.length >= total) seen = [];
  p.seen[placeId] = [...seen, questionId];
  save(p);
}

/* ---- Descobertas: coisas da cena do lugar que a criança já tocou ---- */

const FOUND_KEY = 'cidade:descobertas';

export function getFound(placeId: string): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(FOUND_KEY) ?? 'null');
    if (raw && Array.isArray(raw[placeId])) return raw[placeId].filter((k: unknown) => typeof k === 'string');
  } catch {
    /* sem armazenamento: começa do zero */
  }
  return [];
}

export function saveFound(placeId: string, found: string[]) {
  try {
    const raw = JSON.parse(localStorage.getItem(FOUND_KEY) ?? 'null');
    localStorage.setItem(FOUND_KEY, JSON.stringify({ ...(raw && typeof raw === 'object' ? raw : {}), [placeId]: found }));
  } catch {
    /* ignorado */
  }
}

export function shuffle<T>(items: readonly T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* ---- Voz e sons ---- */

const MUTE_KEY = 'cidade:mudo';

export function isMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setMuted(v: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, v ? '1' : '0');
  } catch {
    /* ignorado */
  }
  if (v) stopVoice();
}

/**
 * Jeito de falar de quem fala: velocidade e tom. A voz (de homem ou de mulher) segue o personagem
 * da criança, como as gravações: personagem menina ouve tudo em voz feminina; menino, em masculina.
 * As vozes "naturais" (Edge: Francisca, Antonio, Thalita; Chrome: Google) soam bem mais
 * humanas que as do sistema e ganham prioridade quando existem.
 */
type Voice = { rate: number; pitch: number };
const VOICES: Record<string, Voice> = {
  narrador: { rate: 0.95, pitch: 1.1 },
  pomba: { rate: 0.95, pitch: 1.1 },
  'seu-zico': { rate: 0.86, pitch: 0.85 },
  sektor: { rate: 1.02, pitch: 1 },
  'dona-rosa': { rate: 0.88, pitch: 1.05 },
};
const MALE = /antonio|daniel|donato|fabio|humberto|julio|nicolau|valerio|ricardo|male|masculin/i;
const FEMALE = /francisca|thalita|maria|leila|leticia|manuela|yara|giovanna|brenda|elza|luciana|female|feminin/i;

let voiceList: SpeechSynthesisVoice[] = [];
if (typeof window !== 'undefined' && window.speechSynthesis) {
  const load = () => (voiceList = window.speechSynthesis.getVoices());
  load();
  window.speechSynthesis.addEventListener?.('voiceschanged', load);
}

/** A voz em português mais humana disponível, preferindo o gênero pedido. */
function pickVoice(gender: 'm' | 'f') {
  const pt = voiceList.filter((v) => v.lang.replace('_', '-').toLowerCase() === 'pt-br');
  const score = (v: SpeechSynthesisVoice) => {
    let s = 0;
    if (/natural|neural|online/i.test(v.name)) s += 10;
    else if (/google/i.test(v.name)) s += 6;
    if ((gender === 'm' ? MALE : FEMALE).test(v.name)) s += 4;
    else if ((gender === 'm' ? FEMALE : MALE).test(v.name)) s -= 4;
    return s;
  };
  return pt.sort((a, b) => score(b) - score(a))[0];
}

/** Tira os emojis (apoio visual na tela): a voz não lê o nome deles. */
export const clean = (text: string) => text.replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '').replace(/\s+/g, ' ').trim();

/** Lê um texto com a voz do navegador, no jeito de falar de `who`. */
function tts(text: string, who: string, onEnd?: () => void) {
  const synth = window.speechSynthesis;
  if (!synth) return onEnd?.();
  const u = new SpeechSynthesisUtterance(clean(text));
  const style = VOICES[who] ?? VOICES.narrador;
  u.lang = 'pt-BR';
  u.rate = style.rate;
  u.pitch = style.pitch;
  const voice = pickVoice(heroGender() === 'menino' ? 'm' : 'f');
  if (voice) u.voice = voice;
  if (onEnd) u.onend = onEnd;
  synth.speak(u);
}

let playing: HTMLAudioElement | null = null;
let turn = 0;
/** Gravações que não existem (não tenta baixar de novo). */
const missing = new Set<string>();
/** Formato que já funcionou para cada pasta de vozes: é o primeiro a tentar nas próximas falas dela. */
const foundExt: Record<string, string> = {};

/** Para qualquer fala em andamento (gravada ou do navegador). */
export function stopVoice() {
  turn++;
  if (playing) {
    // Solta os avisos antes de pausar: a fala interrompida não pode passar por gravação que falta.
    playing.onended = playing.onerror = null;
    playing.pause();
  }
  playing = null;
  window.speechSynthesis?.cancel();
}

/** Formatos aceitos para as gravações, na ordem em que o jogo procura (celular costuma gravar .m4a; WhatsApp, .opus). */
const AUDIO_EXT = ['mp3', 'm4a', 'opus', 'ogg', 'wav'];

/**
 * Lista dos áudios que existem (public/vozes/arquivos.json, gerada no build): caminho sem extensão
 * → extensão. Com ela, o jogo vai direto no arquivo certo; sem ela (ainda carregando), testa os formatos.
 */
let audioList: Record<string, string> | null = null;
if (typeof window !== 'undefined') {
  fetch('/vozes/arquivos.json')
    .then((r) => (r.ok ? r.json() : null))
    .then(
      (j) => (audioList = j),
      () => {},
    );
}

/**
 * Falas sem gravação das crianças: com VOZ_IA, tocam a voz de IA (public/vozes/ia/); com
 * VOZ_NAVEGADOR, a voz do navegador lê. Com as duas desligadas, essas falas ficam em silêncio.
 */
const VOZ_IA = false;
const VOZ_NAVEGADOR = false;

/**
 * Fala uma sequência de trechos. Para cada trecho, toca a primeira que existir, na voz do personagem
 * da criança (public/vozes/<menina|menino>/...; veja lib/vozes.ts):
 *  1. a gravação de `who` (`id`) e, depois, as alternativas do trecho (`alts`, de outras pastas);
 *  2. a voz de IA das mesmas falas (public/vozes/ia/..., gerada por `npm run vozes-ia`), se VOZ_IA;
 *  3. por último, a voz do navegador, se VOZ_NAVEGADOR; senão, passa para o próximo trecho.
 */
export function say(parts: Clip[], who = 'narrador') {
  stopVoice();
  if (isMuted()) return;
  const mine = turn;
  const next = (i: number) => {
    if (mine !== turn || i >= parts.length) return;
    const { id, text, alts = [] } = parts[i];
    const speakIt = () => (VOZ_NAVEGADOR ? tts(text, who, () => next(i + 1)) : next(i + 1));
    const g = heroGender();
    const own = [...(id ? [{ who, id }] : []), ...alts].map((c) => `${g}/${c.who}/${c.id}`);
    const keys = VOZ_IA ? [...own, ...own.map((k) => `ia/${k}`)] : own;
    // Arquivos a tentar: pela lista, só os que existem; sem a lista, cada formato aceito (a IA é sempre .mp3).
    const list = audioList;
    const urls = list
      ? keys.filter((k) => list[k]).map((k) => `/vozes/${k}.${list[k]}`)
      : keys.flatMap((k) => {
          const folder = k.slice(0, k.lastIndexOf('/'));
          const exts = k.startsWith('ia/') ? ['mp3'] : foundExt[folder] ? [foundExt[folder], ...AUDIO_EXT.filter((e) => e !== foundExt[folder])] : AUDIO_EXT;
          return exts.map((e) => `/vozes/${k}.${e}`);
        });
    const tryUrl = (j: number) => {
      if (mine !== turn) return;
      if (j >= urls.length) return speakIt();
      const url = urls[j];
      if (missing.has(url)) return tryUrl(j + 1);
      const audio = new Audio(url);
      playing = audio;
      let failed = false;
      const fail = () => {
        if (failed || mine !== turn) return;
        failed = true;
        missing.add(url);
        tryUrl(j + 1);
      };
      audio.onended = () => next(i + 1);
      audio.onerror = fail;
      audio.play().then(
        () => (foundExt[url.slice('/vozes/'.length, url.lastIndexOf('/'))] = url.slice(url.lastIndexOf('.') + 1)),
        (e: unknown) => {
          // Navegador bloqueou o som antes do primeiro toque (NotAllowed) ou a fala foi
          // interrompida por outra (Abort): a gravação existe, não é para cair na voz do navegador.
          if (!(e instanceof DOMException && (e.name === 'NotAllowedError' || e.name === 'AbortError'))) fail();
        },
      );
    };
    tryUrl(0);
  };
  next(0);
}

/** Lê o texto em voz alta (português do Brasil), para quem ainda não lê sozinho. `who` é o id do mestre. */
export function speak(text: string, who = 'narrador') {
  say([{ text }], who);
}

let ctx: AudioContext | null = null;

export type Sfx = 'ok' | 'oops' | 'pop' | 'bell' | 'splash' | 'rustle' | 'chirp' | 'honk' | 'clang' | 'zap' | 'whir' | 'creak' | 'apito' | 'tictac' | 'ribbit' | 'plim' | 'palmas' | 'musica' | 'zurro';

/** Cada som: notas (Hz), duração de cada nota, forma de onda e volume. Pequenas variações a cada toque. */
const SOUNDS: Record<Sfx, { notes: number[]; step: number; wave: OscillatorType; vol: number; tail?: number }> = {
  ok: { notes: [523, 659, 784, 1047], step: 0.11, wave: 'square', vol: 0.06 },
  oops: { notes: [330, 247], step: 0.11, wave: 'square', vol: 0.06 },
  pop: { notes: [660], step: 0.06, wave: 'square', vol: 0.05 },
  bell: { notes: [784, 988, 784], step: 0.32, wave: 'triangle', vol: 0.09, tail: 3.5 },
  splash: { notes: [900, 620, 420], step: 0.04, wave: 'sine', vol: 0.07 },
  rustle: { notes: [220, 260, 200, 240], step: 0.035, wave: 'sawtooth', vol: 0.02 },
  chirp: { notes: [1800, 2300, 1900], step: 0.05, wave: 'sine', vol: 0.04 },
  honk: { notes: [392, 392], step: 0.16, wave: 'square', vol: 0.05, tail: 0.7 },
  clang: { notes: [1320, 990, 1480], step: 0.05, wave: 'triangle', vol: 0.06, tail: 7 },
  zap: { notes: [220, 440, 880, 1760], step: 0.04, wave: 'sawtooth', vol: 0.025 },
  whir: { notes: [98, 131, 175, 233, 311, 415], step: 0.09, wave: 'triangle', vol: 0.06 },
  creak: { notes: [190, 160, 175, 140], step: 0.1, wave: 'sawtooth', vol: 0.02 },
  apito: { notes: [784, 784, 988, 988, 988], step: 0.16, wave: 'square', vol: 0.045, tail: 1.1 },
  tictac: { notes: [1400, 900, 1400, 900], step: 0.18, wave: 'square', vol: 0.03, tail: 0.3 },
  ribbit: { notes: [180, 240, 160], step: 0.07, wave: 'square', vol: 0.05, tail: 0.8 },
  plim: { notes: [1318, 1046], step: 0.28, wave: 'sine', vol: 0.06, tail: 1.6 },
  palmas: { notes: [320, 290, 340, 300, 330, 280, 310], step: 0.07, wave: 'square', vol: 0.025, tail: 0.25 },
  zurro: { notes: [620, 330, 620, 330], step: 0.24, wave: 'sawtooth', vol: 0.03, tail: 0.9 },
  musica: { notes: [523, 659, 784, 659, 880, 784, 659, 523, 587, 659, 523], step: 0.2, wave: 'triangle', vol: 0.05, tail: 0.6 },
};

/** Sons de videogame gerados na hora (sem arquivos de áudio). */
export function sfx(kind: Sfx) {
  if (isMuted()) return;
  try {
    ctx ??= new AudioContext();
    const { notes, step, wave, vol, tail = 1.6 } = SOUNDS[kind];
    const detune = kind === 'ok' || kind === 'oops' ? 1 : 0.92 + Math.random() * 0.16;
    notes.forEach((f, i) => {
      const o = ctx!.createOscillator();
      const g = ctx!.createGain();
      o.type = wave;
      o.frequency.value = f * detune;
      const t = ctx!.currentTime + i * step;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + step * tail);
      o.connect(g).connect(ctx!.destination);
      o.start(t);
      o.stop(t + step * tail + 0.05);
    });
  } catch {
    /* navegador sem áudio */
  }
}
