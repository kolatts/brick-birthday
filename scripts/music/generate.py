#!/usr/bin/env python3
"""Generates background music locally (ACE-Step via ComfyUI) into public/music/.

Usage: npm run music:generate [-- --force] [-- --only=hub] [-- --seed=N] [-- --prompt="..."]
Needs a ComfyUI server at 127.0.0.1:8188 and the client in the sibling claude-video-editor repo.
"""
import json, os, subprocess, sys, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
TOOLS = os.environ.get("ACESTEP_TOOLS", r"C:\Code\claude-video-editor\tools")
OUT = os.environ.get("MUSIC_OUT") or os.path.join(ROOT, "public", "music")
FADE = 0.15


def run(cmd):
    return subprocess.run(cmd, check=True, capture_output=True, text=True)


def duration(path):
    r = run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path])
    return float(r.stdout.strip())


def process(raw, dst, spec):
    """Trim leading/trailing silence, whole bars, short fades, loudnorm -18 LUFS, mp3 112k joint stereo."""
    bpm = spec["bpm"]
    bar = spec.get("beatsPerBar", 4) * 60.0 / bpm
    with tempfile.TemporaryDirectory() as td:
        trimmed = os.path.join(td, "t.wav")
        run(["ffmpeg", "-y", "-i", raw, "-af",
             "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.05,"
             "areverse,silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.3,areverse", trimmed])
        avail = duration(trimmed)
        cap = spec.get("maxMs", 70000) / 1000.0
        if spec.get("loop", True):
            bars = int(min(avail, cap) // bar)
            length = bars * bar
        else:
            length = min(avail, cap)
        fo = FADE if spec.get("loop", True) else 0.6
        af = (f"atrim=0:{length:.4f},asetpts=PTS-STARTPTS,"
              f"afade=t=in:d={FADE},afade=t=out:st={length - fo:.4f}:d={fo},"
              f"loudnorm=I=-18:TP=-1.5:LRA=11,aresample=44100,atrim=0:{length:.4f}")
        run(["ffmpeg", "-y", "-i", trimmed, "-af", af, "-c:a", "libmp3lame", "-b:a", "112k",
             "-joint_stereo", "1", "-ar", "44100", dst])
    return duration(dst)


def main():
    args = sys.argv[1:]
    force = "--force" in args
    only = next((a.split("=", 1)[1] for a in args if a.startswith("--only=")), None)
    seed_o = next((a.split("=", 1)[1] for a in args if a.startswith("--seed=")), None)
    prompt_o = next((a.split("=", 1)[1] for a in args if a.startswith("--prompt=")), None)
    sys.path.insert(0, TOOLS)
    from acestep_local import AceStepLocal  # type: ignore

    specs = json.load(open(os.path.join(os.path.dirname(__file__), "tracks.json"), encoding="utf-8"))
    os.makedirs(OUT, exist_ok=True)
    mpath = os.path.join(OUT, "manifest.json")
    manifest = {}
    if os.path.exists(mpath):
        manifest = {m["id"]: m for m in json.load(open(mpath, encoding="utf-8"))}
    backend = None
    for spec in specs:
        tid = spec["id"]
        if only and only != tid:
            continue
        dst = os.path.join(OUT, f"{tid}.mp3")
        if os.path.exists(dst) and tid in manifest and not force:
            print(f"skip {tid} (exists)")
            continue
        if backend is None:
            backend = AceStepLocal()
            backend.wait_until_ready()
        prompt = prompt_o or spec["prompt"]
        seed = int(seed_o) if seed_o else spec.get("seed")
        print(f"generating {tid} seed={seed} ...", flush=True)
        data = backend.generate(prompt, spec["genMs"], seed=seed, bpm=spec["bpm"])
        with tempfile.TemporaryDirectory() as td:
            raw = os.path.join(td, "raw.mp3")
            open(raw, "wb").write(data)
            if os.environ.get("KEEP_RAW"):
                open(os.path.join(os.environ["KEEP_RAW"], f"{tid}.raw.mp3"), "wb").write(data)
            secs = process(raw, dst, spec)
        manifest[tid] = {"id": tid, "file": f"{tid}.mp3", "ms": round(secs * 1000), "bpm": spec["bpm"], "loop": bool(spec.get("loop", True))}
        print(f"  -> {tid}.mp3 {secs:.1f}s {os.path.getsize(dst)/1e6:.2f} MB")
    order = [s["id"] for s in specs if s["id"] in manifest]
    json.dump([manifest[i] for i in order], open(mpath, "w", encoding="utf-8"), indent=2)


if __name__ == "__main__":
    main()
