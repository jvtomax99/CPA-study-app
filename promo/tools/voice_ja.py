"""Japanese narration for the how-to video, from promo/src/script-ja.json, with ElevenLabs (eleven_multilingual_v2).
Run from the repo root: python3 promo/tools/voice_ja.py <voice id>   (key in ELEVENLABS_API_KEY; in a cloud session
the proxy adds it). Writes promo/public/voice-ja/<scene>-<n>.mp3 and promo/src/timing-ja.json (each line's length).
The script's spaces mark where the subtitles light up and are dropped from what is said. SAY spells out, in kana,
the codes and names a Japanese voice would otherwise read as English letters; the subtitles keep the script's text.
Voice picked by Jose and his friend from samples (2026-11-16); ~1,300 characters a full run."""
import json, os, re, subprocess, sys, time, urllib.request

MODEL = "eleven_multilingual_v2"
SAY = {"Above the Line": "アバブ・ザ・ライン", "Above Line": "アバブ・ライン", "iOS 26": "アイオーエス・ニジュウロク",
       "「…」ボタン": "三つの点のボタン", "「︙」メニュー": "縦に三つ並んだ点のメニュー", "「PLAY」": "「プレイ」",
       "EA": "イーエー", "CPA": "シーピーエー", "REG": "レグ", "FAR": "ファー", "AUD": "オーディット", "TCP": "ティーシーピー",
       "iPhone": "アイフォン", "Safari": "サファリ", "Android": "アンドロイド", "Chrome": "クローム", "3D": "スリーディー",
       "Web": "ウェブ", "100問": "百問"}
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
voice = sys.argv[1]
only = set(sys.argv[2:])            # optional: just these files, e.g. why-2.mp3
key = os.environ.get("ELEVENLABS_API_KEY", "set-by-proxy")
script = json.load(open(os.path.join(root, "src", "script-ja.json"), encoding="utf-8"))
out = os.path.join(root, "public", "voice-ja"); os.makedirs(out, exist_ok=True)
tpath = os.path.join(root, "src", "timing-ja.json")
timing = json.load(open(tpath)) if os.path.exists(tpath) else {}
def said(line):
    s = line
    for k in sorted(SAY, key=len, reverse=True): s = s.replace(k, SAY[k])
    return s.replace(" ", "")
for scene in script:
    lines = [said(l) for l in scene["lines"]]
    for i, text in enumerate(lines):
        name = f"{scene['id']}-{i}.mp3"
        if only and name not in only: continue
        body = {"text": text, "model_id": MODEL, "voice_settings": {"stability": 0.5, "similarity_boost": 0.75, "style": 0.15, "speed": 1.0},
                "previous_text": lines[i - 1] if i else None, "next_text": lines[i + 1] if i + 1 < len(lines) else None}
        req = urllib.request.Request(f"https://api.elevenlabs.io/v1/text-to-speech/{voice}?output_format=mp3_44100_128",
                                     data=json.dumps(body).encode(), headers={"xi-api-key": key, "Content-Type": "application/json"})
        for tries in range(4):
            try: data = urllib.request.urlopen(req, timeout=120).read(); break
            except Exception as e:
                if tries == 3: raise
                time.sleep(2 ** tries)
        open(os.path.join(out, name), "wb").write(data)
        dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", os.path.join(out, name)], capture_output=True, text=True).stdout)
        timing[name] = round(dur, 3)
        print(f"{name}: {dur:.2f}s  {text}")
json.dump(timing, open(tpath, "w"), indent=1)
print(f"total speech {sum(timing.values()):.1f}s")
