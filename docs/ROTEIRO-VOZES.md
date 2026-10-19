# Roteiro de vozes

> Gerado a partir do jogo (`npm run roteiro`). Não edite à mão: mude a fala no código e gere de novo.

São 76 falas curtas, gravadas por crianças, e **cada uma é gravada duas vezes: por uma menina e por um menino**. No começo do jogo a criança monta o personagem dela; com personagem menina, o jogo inteiro (Pomba e Mestres) fala com as vozes de menina, e com personagem menino, com as de menino. Não precisa gravar tudo de uma vez: o que ainda não tiver gravação fica só no texto da tela, em silêncio.

## Como gravar

- **Um arquivo por fala**, com o nome exato da coluna "Arquivo" (ex.: `entrada.mp3`). Vale `.mp3`, `.m4a` (gravador do Windows e iPhone), `.opus` (áudio do WhatsApp), `.ogg` ou `.wav`.
- A gravação da menina vai em `public/vozes/menina/<pasta>/` e a do menino em `public/vozes/menino/<pasta>/`. O nome da pasta aparece no título de cada personagem, abaixo.
- **Pomba:** cada lugar tem a sua pasta dentro de `pomba` (ex.: `public/vozes/menina/pomba/ponte/`), com um áudio da pergunta (`pergunta-1`, `pergunta-2`...) e um da resposta certa (`resposta-1`, `resposta-2`...). O número é a ordem da pergunta no lugar.
- **Acerto e erro nos lugares:** a Pomba não grava. O jogo toca uma das gravações de acerto ou de erro dos Mestres do Saber, na voz do personagem (menina ou menino).
- Pode gravar no celular, num lugar silencioso, com o aparelho a um palmo da boca.
- Fale **devagar e bem claro**: quem escuta também são crianças aprendendo a ler.
- Deixe só um respiro de silêncio no começo e no fim. Se errar, grave a fala inteira de novo.
- Enquanto uma fala não tem gravação, ela fica **em silêncio** (só o texto na tela). A voz de IA de todas as falas já está pronta em `public/vozes/ia/` e liga com `VOZ_IA = true` em `src/lib/cidade.ts`; a gravação da criança sempre passa na frente.
- Os emojis foram tirados do roteiro. As colunas "Menina" e "Menino" mostram o que já está em cada pasta.

## Pomba (narradora dos lugares) (pasta `pomba`)

**Como fala:** A pombinha guia, alegre e animada, que passeia com a criança pela cidade.

### Em todos os lugares

| Arquivo | Fala | Menina | Menino |
| --- | --- | --- | --- |
| `dica.mp3` | Toque nas coisas para descobrir! |  |  |

### Praça Santa Rita (pasta `pomba/santa-rita`)

| Arquivo | Fala | Menina | Menino |
| --- | --- | --- | --- |
| `santa-rita/pergunta-1.mp3` | Qual é o nome desta praça? |  |  |
| `santa-rita/resposta-1.mp3` | Santa Rita! A santa das rosas. |  |  |
| `santa-rita/pergunta-2.mp3` | O que tem no alto da torre? |  |  |
| `santa-rita/resposta-2.mp3` | Uma cruz! E lá dentro mora o sino. |  |  |
| `santa-rita/pergunta-3.mp3` | O povo vem na praça pra fazer o quê? |  |  |
| `santa-rita/resposta-3.mp3` | Encontrar os amigos! A praça é o coração da cidade. |  |  |

### Ponte Metálica (pasta `pomba/ponte`)

| Arquivo | Fala | Menina | Menino |
| --- | --- | --- | --- |
| `ponte/pergunta-1.mp3` | Por que a Ponte Metálica de Cataguases é considerada importante para a história da cidade? | gravada | gravada |
| `ponte/resposta-1.mp3` | Porque ela ajudou a ligar diferentes partes da cidade, facilitando a passagem de pessoas e mercadorias e contribuindo para o desenvolvimento de Cataguases. | gravada | gravada |
| `ponte/pergunta-2.mp3` | O que mudou na vida das pessoas depois da construção da Ponte Metálica? | gravada | gravada |
| `ponte/resposta-2.mp3` | Ficou mais fácil de viajar, trabalhar e estudar. | gravada | gravada |

### Museu Energisa (pasta `pomba/museu`)

| Arquivo | Fala | Menina | Menino |
| --- | --- | --- | --- |
| `museu/pergunta-1.mp3` | Por que é importante conhecer a história da eletricidade em Cataguases? | gravada | gravada |
| `museu/resposta-1.mp3` | Porque entendemos como as invenções e os conhecimentos ajudaram a transformar a vida das pessoas. | gravada | gravada |
| `museu/pergunta-2.mp3` | Como a chegada da energia elétrica ajudou as pessoas de Cataguases no dia a dia? | gravada | gravada |
| `museu/resposta-2.mp3` | A energia elétrica permitiu iluminar casas e ruas, além de ajudar no funcionamento de máquinas, escolas, comércios e fábricas, tornando a vida das pessoas mais fácil e segura. | gravada | gravada |

### Estação Cataguases (pasta `pomba/estacao`)

| Arquivo | Fala | Menina | Menino |
| --- | --- | --- | --- |
| `estacao/pergunta-1.mp3` | O que podemos aprender ao conhecer a história da Estação Ferroviária de Cataguases? | gravada | gravada |
| `estacao/resposta-1.mp3` | Podemos entender como o trem ajudou no desenvolvimento da cidade. | gravada | gravada |
| `estacao/pergunta-2.mp3` | Como a estação ajudou as pessoas a conhecerem novas culturas e costumes? | gravada | gravada |
| `estacao/resposta-2.mp3` | Porque permitiu a chegada e a saída de pessoas, favorecendo a troca de experiências, ideias e tradições. | gravada | gravada |

### Chácara Dona Catarina (pasta `pomba/chacara`)

| Arquivo | Fala | Menina | Menino |
| --- | --- | --- | --- |
| `chacara/pergunta-1.mp3` | Por que a Chácara Catarina é um lugar especial para a cidade? |  | gravada |
| `chacara/resposta-1.mp3` | Porque guarda histórias antigas, mostra tradições e é um espaço de encontro para aprender e brincar. |  | gravada |
| `chacara/pergunta-2.mp3` | Como a Chácara Catarina ajuda a preservar a história da cidade? |  | gravada |
| `chacara/resposta-2.mp3` | Guardando memórias, objetos antigos e mostrando como as pessoas viviam no passado. |  | gravada |

### Centro Cultural Humberto Mauro (pasta `pomba/cultural`)

| Arquivo | Fala | Menina | Menino |
| --- | --- | --- | --- |
| `cultural/pergunta-1.mp3` | O que as crianças podem aprender ao visitar o Centro Cultural Humberto Mauro? | gravada | gravada |
| `cultural/resposta-1.mp3` | Elas podem aprender sobre cinema, arte, história e a importância da cultura para a comunidade. | gravada | gravada |
| `cultural/pergunta-2.mp3` | O que o Humberto Mauro nos ensina sobre o cinema? | gravada | gravada |
| `cultural/resposta-2.mp3` | O cinema ajuda a contar histórias, preservar memórias e levar a cultura de um povo para todo o mundo! | gravada | gravada |

### Memorial Nanzita (pasta `pomba/nanzita`)

| Arquivo | Fala | Menina | Menino |
| --- | --- | --- | --- |
| `nanzita/pergunta-1.mp3` | O que tem na parede de baixo da casa? |  |  |
| `nanzita/resposta-1.mp3` | Um painel enorme, feito de azulejos! |  |  |
| `nanzita/pergunta-2.mp3` | Que bicho aparece no painel? |  |  |
| `nanzita/resposta-2.mp3` | Um burrinho, carregando a carga nas costas! |  |  |
| `nanzita/pergunta-3.mp3` | Quem morava nesta casa? |  |  |
| `nanzita/resposta-3.mp3` | A artista Nanzita! Hoje a casa guarda a arte dela. |  |  |

### Painel do Educandário (pasta `pomba/educandario`)

| Arquivo | Fala | Menina | Menino |
| --- | --- | --- | --- |
| `educandario/pergunta-1.mp3` | Que bicho voa no painel? |  |  |
| `educandario/resposta-1.mp3` | Pombas! Brancas e azuis, voando juntas. |  |  |
| `educandario/pergunta-2.mp3` | Do que é feito o painel? |  |  |
| `educandario/resposta-2.mp3` | De azulejos! Cada quadradinho foi pintado. |  |  |
| `educandario/pergunta-3.mp3` | Onde esta obra de arte foi feita? |  |  |
| `educandario/resposta-3.mp3` | Na parede! A arte faz parte do prédio. |  |  |

### Prédio Sicredi (pasta `pomba/sicredi`)

| Arquivo | Fala | Menina | Menino |
| --- | --- | --- | --- |
| `sicredi/pergunta-1.mp3` | Hoje é o Sicredi. E antes, o que era? |  |  |
| `sicredi/resposta-1.mp3` | Um hotel! O Grande Hotel Villas. |  |  |
| `sicredi/pergunta-2.mp3` | Qual é a cor do prédio? |  |  |
| `sicredi/resposta-2.mp3` | Verde, com enfeites brancos! |  |  |
| `sicredi/pergunta-3.mp3` | Onde fica o prédio do Sicredi? |  |  |
| `sicredi/resposta-3.mp3` | No centro da cidade! Todo mundo repara nele. |  |  |

## Seu Zico (pasta `seu-zico`)

**Como fala:** Um vovô da roça, calmo e brincalhão. Pode engrossar um pouquinho a voz e falar devagar, sem pressa.

### Quando a criança entra

| Arquivo | Fala | Menina | Menino |
| --- | --- | --- | --- |
| `entrada.mp3` | Ô de fora! Essa é a casa do Seu Zico. Bora jogar? |  |  |

### Quando acerta

| Arquivo | Fala | Menina | Menino |
| --- | --- | --- | --- |
| `acerto-1.mp3` | Ô trem bão! Acertou! |  |  |

### Quando erra

| Arquivo | Fala | Menina | Menino |
| --- | --- | --- | --- |
| `erro-1.mp3` | Uai, quase! Escuta só. |  |  |

### Perguntas e curiosidades

| Arquivo | Fala | Menina | Menino |
| --- | --- | --- | --- |
| `causo-pergunta.mp3` | Cê sabe o que é um causo? |  |  |
| `causo-curiosidade.mp3` | É uma história contada de boca em boca! |  |  |
| `rio-pomba-pergunta.mp3` | Que rio passa aqui em Cataguases? |  |  |
| `rio-pomba-curiosidade.mp3` | O Rio Pomba! Eu pescava lambari nele. |  |  |
| `pao-de-queijo-pergunta.mp3` | Que cheirinho bom! Adivinha o que é? |  |  |
| `pao-de-queijo-curiosidade.mp3` | Pão de queijo, uai! O orgulho de Minas. |  |  |

## Sektor (pasta `sektor`)

**Como fala:** Um rapaz animado do Hip Hop. Fala com ritmo e alegria, como quem está numa roda de dança.

### Quando a criança entra

| Arquivo | Fala | Menina | Menino |
| --- | --- | --- | --- |
| `entrada.mp3` | Oi! Você entrou no estúdio do Sektor. Bora pro desafio? |  | gravada |

### Quando acerta

| Arquivo | Fala | Menina | Menino |
| --- | --- | --- | --- |
| `acerto-1.mp3` | Acertou na batida, resposta garantida! |  | gravada |
| `acerto-2.mp3` | É nóis! Cê manja muito! |  | gravada |

### Quando erra

| Arquivo | Fala | Menina | Menino |
| --- | --- | --- | --- |
| `erro-1.mp3` | Errar faz parte do rolê. Bora aprender! |  | gravada |
| `erro-2.mp3` | Sem estresse! Se liga que eu te explico. |  | gravada |

### Perguntas e curiosidades

| Arquivo | Fala | Menina | Menino |
| --- | --- | --- | --- |
| `elementos-pergunta.mp3` | O Hip Hop tem uns elementos que andam sempre juntos. Sabe um deles? |  | gravada |
| `elementos-curiosidade.mp3` | O Hip Hop tem DJ, MC, breaking e grafite. E o quinto elemento: o conhecimento! |  | gravada |
| `grafite-pergunta.mp3` | Olha esse muro colorido atrás de mim! Sabe o que é o grafite? |  | gravada |
| `grafite-curiosidade.mp3` | Grafite é arte pintada no muro! Mas antes tem que pedir licença pro dono do muro. |  | gravada |
| `origem-pergunta.mp3` | O Hip Hop rodou o mundo até chegar aqui. Sabe onde ele nasceu? |  | gravada |
| `origem-curiosidade.mp3` | Nasceu em Nova York, nas festas de rua, lá nos anos 1970. Depois chegou no Brasil! |  | gravada |
| `freeze-pergunta.mp3` | No breaking tem um passo em que a gente fica paradinho, igual estátua. Qual é? |  | gravada |
| `freeze-curiosidade.mp3` | É o freeze: congelar numa pose! O breaking já foi até esporte nas Olimpíadas. |  | gravada |

## Dona Rosa (pasta `dona-rosa`)

**Como fala:** Uma vovó carinhosa. Fala devagar e com doçura, como quem conversa com um netinho.

### Quando a criança entra

| Arquivo | Fala | Menina | Menino |
| --- | --- | --- | --- |
| `entrada.mp3` | Oi, minha flor! Essa é a casa da Dona Rosa. Vamos brincar? | gravada |  |

### Quando acerta

| Arquivo | Fala | Menina | Menino |
| --- | --- | --- | --- |
| `acerto-1.mp3` | Muito bem, minha flor! | gravada |  |

### Quando erra

| Arquivo | Fala | Menina | Menino |
| --- | --- | --- | --- |
| `erro-1.mp3` | Quase, meu anjo! Escuta só. | gravada |  |

### Perguntas e curiosidades

| Arquivo | Fala | Menina | Menino |
| --- | --- | --- | --- |
| `agulha-pergunta.mp3` | Pra bordar, a gente usa o quê? | gravada |  |
| `agulha-curiosidade.mp3` | Agulha e linha! Cada furinho vira um pontinho. | gravada |  |
| `ponto-cruz-pergunta.mp3` | Tem um ponto feito de xizinhos. Qual é? | gravada |  |
| `ponto-cruz-curiosidade.mp3` | Ponto cruz! Feito de xizinhos. | gravada |  |
| `aprender-pergunta.mp3` | Como será que eu aprendi a bordar? | gravada |  |
| `aprender-curiosidade.mp3` | Com quem já sabe! Eu aprendi com a minha avó. | gravada |  |
