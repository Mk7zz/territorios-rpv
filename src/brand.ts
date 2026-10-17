/**
 * Identidade da instância (white label). Para licenciar a plataforma para outra organização,
 * troque os textos abaixo, as cores em `theme.css` e o desenho da marca em `components/Brand.tsx`.
 * Nenhum outro arquivo do frontend tem o nome do cliente escrito diretamente.
 */
export const BRAND = {
  /** Nome curto do produto, usado no logo e no título da aba. */
  name: 'Multiverso',
  /** Território/ecossistema que dá nome ao mundo. */
  place: 'Rio Pomba Valley',
  shortName: 'Multiverso RPV',
  fullName: 'Multiverso Rio Pomba Valley',
  organization: 'Instituto Energisa',
  site: { label: 'riopombavalley.org.br', url: 'https://riopombavalley.org.br/' },
  motto: 'educação + inovação + conexão com o mercado',
  audience: 'a juventude da Zona da Mata',
  /** Como o mundo do jogo é chamado nas falas ("o Vale"). */
  world: { name: 'Vale', article: 'o', withPrep: 'no Vale', ofPrep: 'do Vale' },
  /** Personagem guia que conversa com o(a) aluno(a) no onboarding e no mundo. */
  guide: { name: 'Pomba', role: 'guia do Vale' },
} as const;
