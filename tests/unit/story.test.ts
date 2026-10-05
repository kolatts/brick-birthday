import { describe, expect, it } from 'vitest';
import { heroes, places, powers, problems, bonusSentences } from '../../src/zones/story/options';
import { templates } from '../../src/zones/story/templates';
import { generateStory, renderTemplate, slotsFor, bonusSentence } from '../../src/zones/story/generator';
import { isCorrectOrder, movieStories, shuffleOrder, narrationFor } from '../../src/zones/story/movie';
import { finishStory } from '../../src/zones/story/rewards';
import { useProgress } from '../../src/state/progress';

const BAD = /undefined|null|TODO|[{}]|NaN/;

describe('story templates', () => {
  it('has about 40 templates of 3-5 sentences', () => {
    expect(templates.length).toBeGreaterThanOrEqual(40);
    for (const t of templates) {
      expect(t.length).toBeGreaterThanOrEqual(3);
      expect(t.length).toBeLessThanOrEqual(5);
    }
  });

  it('has enough options', () => {
    expect(places.length).toBeGreaterThanOrEqual(8);
    expect(problems.length).toBeGreaterThanOrEqual(8);
    expect(powers.length).toBeGreaterThanOrEqual(8);
    expect(heroes.filter((h) => h.kind === 'cameo')).toHaveLength(3);
  });

  it('every hero x place x problem x power x template renders cleanly', () => {
    let count = 0;
    for (const h of heroes)
      for (const pl of places)
        for (const pr of problems)
          for (const po of powers) {
            const slots = slotsFor(h, pl, pr, po);
            for (let i = 0; i < templates.length; i++) {
              for (const sentence of renderTemplate(i, slots)) {
                count++;
                if (BAD.test(sentence) || !/[.!?]["”]?$/.test(sentence) || !/^["“]?[A-Z]/.test(sentence)) {
                  throw new Error(`Bad sentence (${h.id}/${pl.id}/${pr.id}/${po.id}/t${i}): ${sentence}`);
                }
              }
            }
          }
    expect(count).toBeGreaterThan(100000);
  });

  it('bonus sentences are clean', () => {
    for (const b of bonusSentences) expect(b).not.toMatch(BAD);
    expect(bonusSentence(5)).toBe(bonusSentence(5));
  });
});

describe('generator', () => {
  const picks = { hero: 'mom', place: 'island', problem: 'sock', power: 'giggle' };
  it('is deterministic for a seed and varies with seeds', () => {
    expect(generateStory(picks, 42)).toEqual(generateStory(picks, 42));
    expect(generateStory(picks)).toEqual(generateStory(picks));
    const seen = new Set(Array.from({ length: 30 }, (_, i) => generateStory(picks, i).sentences.join('|')));
    expect(seen.size).toBeGreaterThan(5);
  });
  it('uses the hero name and never emits placeholders', () => {
    const s = generateStory(picks, 1);
    expect(s.title).toContain('Mom');
    expect(s.sentences.join(' ')).not.toMatch(BAD);
  });
  it('survives unknown picks', () => {
    const s = generateStory({ hero: 'zzz', place: 'zzz', problem: 'zzz', power: 'zzz' });
    expect(s.sentences.join(' ')).not.toMatch(BAD);
  });
});

describe('movie night', () => {
  it('has 3 stories with 4 scenes', () => {
    expect(movieStories).toHaveLength(3);
    for (const m of movieStories) expect(m.scenes).toHaveLength(4);
  });
  it('order checker accepts only 0,1,2,3', () => {
    expect(isCorrectOrder([0, 1, 2, 3])).toBe(true);
    expect(isCorrectOrder([3, 2, 1, 0])).toBe(false);
    expect(isCorrectOrder([0, 1, 2, null])).toBe(false);
    expect(isCorrectOrder([0, 1, 2])).toBe(false);
  });
  it('shuffles are permutations that are never in order', () => {
    for (let s = 0; s < 200; s++) {
      const o = shuffleOrder(s);
      expect([...o].sort()).toEqual([0, 1, 2, 3]);
      expect(isCorrectOrder(o)).toBe(false);
    }
  });
  it('narrates in the placed order', () => {
    const m = movieStories[0];
    expect(narrationFor(m, [3, 2, 1, 0])[0]).toBe(m.scenes[3].line);
  });
});

describe('story rewards', () => {
  it('cameo story earns brick 1 only; family story then earns brick 2', () => {
    useProgress.getState().reset();
    expect(finishStory('cameo').earned).toBe(1);
    expect(useProgress.getState().bricks.story).toBe(1);
    expect(useProgress.getState().familyHeroStoryDone).toBe(false);
    expect(finishStory('family').earned).toBe(1);
    expect(useProgress.getState().bricks.story).toBe(2);
    expect(useProgress.getState().familyHeroStoryDone).toBe(true);
    expect(useProgress.getState().storiesFinished).toBe(2);
    expect(finishStory('pet').earned).toBe(0);
    useProgress.getState().reset();
  });
  it('a first family story earns both bricks', () => {
    useProgress.getState().reset();
    expect(finishStory('family').earned).toBe(2);
    useProgress.getState().reset();
  });
});

describe('story fragments', () => {
  const words = (s: string) => s.split(/\s+/).filter(Boolean);
  it('fragments align word-for-word with rendered sentences and are all pre-generatable', async () => {
    const { storyFragmentsBySentence, allStaticFragments, storyFragments } = await import('../../src/zones/story/generator');
    const known = new Set(allStaticFragments().map((f) => f.text));
    expect(known.size).toBeGreaterThan(100);
    let checked = 0;
    for (const h of heroes)
      for (const pl of places.slice(0, 3))
        for (let seed = 0; seed < 45; seed++) {
          const picks = { hero: h.id, place: pl.id, problem: problems[seed % problems.length].id, power: powers[seed % powers.length].id };
          const story = generateStory(picks, seed);
          const frags = storyFragmentsBySentence(picks, seed);
          expect(frags).toHaveLength(story.sentences.length);
          frags.forEach((fs, i) => {
            const spoken = fs.map((f) => f.text).join(' ');
            expect(words(spoken).length).toBe(words(story.sentences[i]).length);
            for (const f of fs) {
              expect(f.speaker).toBe('narrator');
              if (!known.has(f.text)) throw new Error(`Missing static fragment: ${f.text}`);
            }
            checked++;
          });
        }
    expect(checked).toBeGreaterThan(1000);
    expect(storyFragments({ hero: 'mom', place: 'island', problem: 'sock', power: 'giggle' }, 1).length).toBeGreaterThan(5);
  });
});
