"""Generate pre-recorded game narration with Azure AI Speech.

Reads scripts/voices/lines.json (npm run voices:extract) and scripts/voices/cast.json,
synthesizes each missing clip (24kHz 48kbps mono MP3) with SSML prosody per speaker, and
writes public/voices/<id>.mp3 plus public/voices/manifest.json:
  { "<id>": { "speaker", "text", "ms", "timings": [[audioMs, charOffset, wordLen], ...] } }

The id is a hash that MUST match src/audio/voices.ts (see clip_id below and the shared
test vectors in tests/unit/voices.test.ts).

Usage:
  uv run --with azure-cognitiveservices-speech python scripts/voices/generate.py [--force] [--dry-run]
Env (or C:/Code/brick-birthday/.env.local):
  SPEECH_KEY    - Azure Speech key (never printed, never committed)
  SPEECH_REGION - default centralus
"""
import html
import json
import os
import re
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
HERE = Path(__file__).resolve().parent
OUT = ROOT / "public" / "voices"


# ---- hashing (mirror of src/audio/voices.ts) -------------------------------

def normalize_text(text):
    return re.sub(r"\s+", " ", unicodedata.normalize("NFC", text)).strip()


def _fnv1a32(data, seed):
    h = seed & 0xFFFFFFFF
    for b in data:
        h ^= b
        h = (h * 16777619) & 0xFFFFFFFF
    return h


def hash_key(key):
    data = key.encode("utf-8")
    return f"{_fnv1a32(data, 2166136261):08x}{_fnv1a32(data, 0x9747B28C):08x}"


def clip_id(speaker, text):
    return hash_key(f"{speaker}|{normalize_text(text)}")


# ---- env ---------------------------------------------------------------------

def load_env():
    env_file = ROOT / ".env.local"
    if not env_file.exists():
        return
    for raw in env_file.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        k = k.strip().removeprefix("export ").strip()
        v = v.strip().strip('"').strip("'")
        os.environ.setdefault(k, v)


# ---- synthesis -----------------------------------------------------------------

def ssml_for(text, voice, pitch, rate):
    return (
        '<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="en-US">'
        f'<voice name="{voice}"><prosody pitch="{pitch}" rate="{rate}">{html.escape(text, quote=False)}</prosody></voice></speak>'
    )


def synthesize(speechsdk, key, region, text, voice, pitch, rate):
    cfg = speechsdk.SpeechConfig(subscription=key, region=region)
    cfg.set_speech_synthesis_output_format(speechsdk.SpeechSynthesisOutputFormat.Audio24Khz48KBitRateMonoMp3)
    synth = speechsdk.SpeechSynthesizer(speech_config=cfg, audio_config=None)
    bounds = []

    def on_boundary(evt):
        if evt.boundary_type == speechsdk.SpeechSynthesisBoundaryType.Word:
            bounds.append([round(evt.audio_offset / 10000), evt.text])

    synth.synthesis_word_boundary.connect(on_boundary)
    result = synth.speak_ssml_async(ssml_for(text, voice, pitch, rate)).get()
    if result.reason != speechsdk.ResultReason.SynthesizingAudioCompleted:
        detail = result.cancellation_details.error_details if result.reason == speechsdk.ResultReason.Canceled else ""
        raise RuntimeError(f"synthesis failed: {result.reason} {detail}")
    # text_offset points into the SSML, so rebuild offsets into the plain text by scanning forward.
    timings, cursor = [], 0
    for ms, w in bounds:
        idx = text.find(w, cursor)
        if idx < 0:
            continue  # punctuation-only boundary; skip rather than misplace a highlight
        timings.append([ms, idx, len(w)])
        cursor = idx + len(w)
    return result.audio_data, timings, round(result.audio_duration.total_seconds() * 1000)


def main():
    force = "--force" in sys.argv
    dry = "--dry-run" in sys.argv
    lines = json.loads((HERE / "lines.json").read_text(encoding="utf-8"))
    cast = json.loads((HERE / "cast.json").read_text(encoding="utf-8"))
    OUT.mkdir(parents=True, exist_ok=True)
    mpath = OUT / "manifest.json"
    manifest = json.loads(mpath.read_text(encoding="utf-8")) if mpath.exists() else {}

    # Prune entries whose file is gone.
    manifest = {k: v for k, v in manifest.items() if (OUT / f"{k}.mp3").exists()}

    todo = []
    for ln in lines:
        lid = clip_id(ln["speaker"], ln["text"])
        if lid != ln.get("id", lid):
            sys.exit(f"hash mismatch for {ln['text']!r}: lines.json {ln['id']} vs python {lid}")
        if ln["speaker"] not in cast:
            sys.exit(f"speaker {ln['speaker']!r} is not in cast.json")
        if force or lid not in manifest:
            todo.append((lid, ln))

    chars = sum(len(ln["text"]) for _, ln in todo)
    print(f"{len(lines)} lines total; {len(todo)} to generate, {chars} characters")
    if dry:
        return
    if not todo:
        mpath.write_text(json.dumps(manifest, indent=1) + "\n", encoding="utf-8")
        return

    load_env()
    key = os.environ.get("SPEECH_KEY")
    region = os.environ.get("SPEECH_REGION", "centralus")
    if not key:
        sys.exit("SPEECH_KEY is not set (env or .env.local)")
    import azure.cognitiveservices.speech as speechsdk

    for i, (lid, ln) in enumerate(todo, 1):
        c = cast[ln["speaker"]]
        audio, timings, ms = synthesize(speechsdk, key, region, ln["text"], c["voice"], c["pitch"], c["rate"])
        (OUT / f"{lid}.mp3").write_bytes(audio)
        manifest[lid] = {"speaker": ln["speaker"], "text": ln["text"], "ms": ms, "timings": timings}
        print(f"[{i}/{len(todo)}] {ln['speaker']}: {ln['text'][:50]}")
        mpath.write_text(json.dumps(manifest, indent=1) + "\n", encoding="utf-8")
    total = sum(p.stat().st_size for p in OUT.glob("*.mp3"))
    print(f"done: {len(manifest)} clips, {total / 1e6:.2f} MB")


if __name__ == "__main__":
    main()
