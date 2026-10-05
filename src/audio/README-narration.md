# Narration contract

Every spoken line uses a pre-generated Azure neural voice clip (`public/voices/<id>.mp3` plus
`manifest.json` word timings). `speechSynthesis` is only the fallback when a clip is missing.

## Speaking

```ts
import { say, sayFragments } from '../audio/speech';
say('You found a coupon!', { speaker: 'narrator', onWord: (i, w) => highlight(i) });
sayFragments([{ speaker: 'mom', text: 'Once upon a time, ' }, { speaker: 'mom', text: 'Luna' }, { speaker: 'mom', text: ' saved the day.' }]);
```

Speakers: narrator, luna, mom, dad, julian, darian, rudolph, jinglebells, fox, deer, songbird,
squirrel, rabbit, moon, babylady, cottontail (see `src/config/voices.ts`). Default is `narrator`.
Legacy `{pitch, rate}` options still work and only affect the fallback voice.

The clip id is `hash(speaker + "|" + normalizedText)` (whitespace collapsed, trimmed). So the text
you pass to `say` must be EXACTLY the registered text (same speaker). Any change to a line needs a
re-extract and re-generate.

## Registering lines

1. Static lines: add to `COPY` in `src/config/copy.ts` (narrator), or export `lines: {speaker, text}[]`
   from `src/zones/<zone>/lines.ts` (auto-discovered), or add a collector in `scripts/voices/lines.ts`.
2. `npm run voices:extract` (writes `scripts/voices/lines.json` and `cast.json`; commit both).
3. `npm run voices:generate` (needs `SPEECH_KEY` in env or `.env.local`; skips existing clips;
   `-- --dry-run` shows count/characters, `-- --force` redoes all). Commit `public/voices/`.

## Dynamic story text (Story Tower)

A generated sentence has no clip, so split it into template chunks and slot values, each of which
is registered and spoken as a fragment. `sayFragments` plays them back to back and `onWord` indexes
continue across fragments, so highlighting spans the whole sentence. Rules:

- Template literal chunks (the text between `{slots}`) and every possible slot value (hero names,
  places, problems, powers, with their `atPlace` variants) must be exported as `lines` from
  `src/zones/story/lines.ts`, all with the same speaker (usually `mom`/`narrator`) so the voice stays
  consistent. Chunks keep their own spaces, e.g. `'Suddenly, '` then `'a dragon'`; the pure helper
  trims whitespace per fragment, so keep spaces inside the fragments for display text only and
  concatenate display text yourself.
- Capitalization applied by the generator must be reflected in the registered chunk text.
- Anything without a registered clip falls back to Web Speech for that fragment only.

## Fallback and tests

`?test=1` stubs speech: `onWord` fires for every word immediately, no audio. Unmute/volume come from
the settings store. Size: about 26 KB per clip average (24 kHz, 48 kbps mono).
