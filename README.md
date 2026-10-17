# Territórios

**Onde a cultura cresce com você!** Jogo educativo para crianças: a criança cria um personagem, explora o mapa de Cataguases (MG), visita pontos turísticos reais e conversa com os Mestres do Saber da cultura popular. As falas são gravadas por crianças, em versão de menina e de menino.

Projeto separado do [Multiverso RPV](https://github.com/Mk7zz/Multiverso-RPV), de onde veio (pasta `web/src/pages/cidade` e as peças que ela usa). Não precisa de servidor nem de banco: é um site estático (React 19 + Vite + TypeScript), e o progresso fica no navegador.

## Como rodar

Requer Node.js 22.13 ou superior.

```bash
npm install
npm run dev        # http://localhost:5174
```

| Comando | Para que serve |
|---|---|
| `npm run dev` | Site em modo de desenvolvimento |
| `npm run build` | Checagem de tipos e build em `dist/` |
| `npm run preview` | Abre o build de `dist/` |
| `npm run typecheck` | Só a checagem de tipos |
| `npm run roteiro` | Gera `docs/ROTEIRO-VOZES.md` com todas as falas e o que já foi gravado |

`?hora=dia`, `?hora=tarde` ou `?hora=noite` na URL fixam a hora do dia das cenas.

## Telas

| Rota | Tela |
|---|---|
| `/` | Tela de início |
| `/personagem` | Criador de personagem (menina/menino, pele, cabelo, roupa, cores) |
| `/mapa` | Mapa de Cataguases |
| `/lugar/:id` | Cena de um ponto turístico: `santa-rita`, `ponte`, `museu`, `estacao`, `chacara`, `cultural`, `nanzita`, `educandario`, `sicredi` |
| `/mestre/:id` | Casa de um Mestre do Saber: `seu-zico`, `sektor`, `dona-rosa` |

## Estrutura

```
src/
  pages/cidade/     telas do jogo, uma cena por ponto turístico (base comum em sceneKit.tsx)
  components/       mapa (CityWorld), construções, Mestres, personagem, ícones e cenário em pixel-art
  lib/cidade.ts     lugares, perguntas, pontos e sons
  lib/vozes.ts      qual gravação toca em cada fala
  lib/personagem.ts personagem salvo no navegador
public/vozes/       gravações: vozes/<menina|menino>/<pomba|seu-zico|sektor|dona-rosa>/
scripts/            gerador do roteiro de vozes
docs/               roteiro de vozes e falas da Pomba para gravar
```

## Publicar

O `vercel.json` já está pronto: importe o repositório na Vercel e ela usa `npm run build` e publica `dist/`.
