"""
Gera a voz de IA (vozes neurais da Microsoft, via edge-tts) de cada fala listada por
scripts/falas-ia.ts, em public/vozes/ia/<menina|menino>/<quem>/<id>.mp3. Só refaz o áudio quando o
texto ou a voz mudou (public/vozes/ia/textos.json guarda o que já foi gerado).
As gravações das crianças sempre têm preferência: a voz de IA só toca onde ainda não há gravação.

Precisa de: python -m pip install edge-tts
"""
import asyncio, json, os, sys
import edge_tts

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FALAS = os.path.join(ROOT, 'node_modules', '.cache', 'falas-ia.json')
OUT = os.path.join(ROOT, 'public', 'vozes', 'ia')
DONE = os.path.join(OUT, 'textos.json')

# Voz, velocidade e tom de cada personagem, na voz de menina e na de menino.
VOZES = {
    'menina': {
        'pomba': ('pt-BR-ThalitaMultilingualNeural', '+0%', '+4Hz'),
        'sektor': ('pt-BR-ThalitaMultilingualNeural', '+6%', '+0Hz'),
        'dona-rosa': ('pt-BR-FranciscaNeural', '-8%', '+0Hz'),
        'seu-zico': ('pt-BR-FranciscaNeural', '-10%', '-6Hz'),
    },
    'menino': {
        'pomba': ('pt-BR-AntonioNeural', '+2%', '+6Hz'),
        'sektor': ('pt-BR-AntonioNeural', '+8%', '+2Hz'),
        'dona-rosa': ('pt-BR-AntonioNeural', '-8%', '+0Hz'),
        'seu-zico': ('pt-BR-AntonioNeural', '-12%', '-8Hz'),
    },
}


async def gera(sem, fala, genero, done):
    voz, rate, pitch = VOZES[genero][fala['who']]
    key = f"{genero}/{fala['who']}/{fala['id']}"
    sig = f'{voz}|{rate}|{pitch}|{fala["text"]}'
    path = os.path.join(OUT, *key.split('/')) + '.mp3'
    if done.get(key) == sig and os.path.exists(path):
        return 0
    os.makedirs(os.path.dirname(path), exist_ok=True)
    async with sem:
        for tentativa in range(3):
            try:
                await edge_tts.Communicate(fala['text'], voz, rate=rate, pitch=pitch).save(path)
                break
            except Exception as e:  # rede instável: tenta de novo
                if tentativa == 2:
                    print(f'falhou {key}: {e}', file=sys.stderr)
                    return 0
                await asyncio.sleep(2)
    done[key] = sig
    return 1


async def main():
    falas = json.load(open(FALAS, encoding='utf-8'))
    done = json.load(open(DONE, encoding='utf-8')) if os.path.exists(DONE) else {}
    sem = asyncio.Semaphore(4)
    feitas = await asyncio.gather(*(gera(sem, f, g, done) for g in VOZES for f in falas))
    os.makedirs(OUT, exist_ok=True)
    json.dump(done, open(DONE, 'w', encoding='utf-8'), ensure_ascii=False, indent=1, sort_keys=True)
    print(f'{sum(feitas)} áudios gerados, {len(falas) * len(VOZES) - sum(feitas)} já estavam prontos')


asyncio.run(main())
