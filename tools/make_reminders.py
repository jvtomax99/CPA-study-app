"""Write one calendar file per half hour (5:00 AM to 11:30 PM) into reminders/.
Each is a daily repeating "EA practice" event with an alert at its start, in the phone's local time.
Run from the repo root: python3 tools/make_reminders.py"""
import os

APP_URL = "https://jvtomax99.github.io/CPA-study-app/"
root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
out = os.path.join(root, "reminders")
os.makedirs(out, exist_ok=True)


def fold(line):
    """iCalendar lines are limited to 75 octets; longer ones continue on the next line after a space."""
    b = line.encode("utf-8")
    if len(b) <= 75:
        return line
    parts, cur = [], b""
    for ch in line:
        e = ch.encode("utf-8")
        if len(cur) + len(e) > (75 if not parts else 74):
            parts.append(cur.decode("utf-8")); cur = b""
        cur += e
    parts.append(cur.decode("utf-8"))
    return "\r\n ".join(parts)


for h in range(5, 24):
    for m in (0, 30):
        hhmm = f"{h:02d}{m:02d}"
        end_h, end_m = (h, m + 15)
        lines = [
            "BEGIN:VCALENDAR",
            "VERSION:2.0",
            "PRODID:-//EA Ledger Drill//Daily practice reminder//EN",
            "CALSCALE:GREGORIAN",
            "METHOD:PUBLISH",
            "BEGIN:VEVENT",
            f"UID:ea-ledger-drill-daily-practice-{hhmm}@jvtomax99.github.io",
            "DTSTAMP:20261102T000000Z",
            # no time zone on purpose: a "floating" time follows whatever zone the phone is in
            f"DTSTART:20261101T{hhmm}00",
            f"DTEND:20261101T{end_h:02d}{end_m:02d}00",
            "RRULE:FREQ=DAILY",
            "SUMMARY:EA practice",
            f"DESCRIPTION:Time for today's questions in EA Ledger Drill: {APP_URL}",
            f"URL:{APP_URL}",
            "BEGIN:VALARM",
            "ACTION:DISPLAY",
            "DESCRIPTION:EA practice",
            "TRIGGER:PT0M",
            "END:VALARM",
            "END:VEVENT",
            "END:VCALENDAR",
        ]
        with open(os.path.join(out, f"ea-practice-{hhmm}.ics"), "w", encoding="utf-8", newline="") as f:
            f.write("\r\n".join(fold(l) for l in lines) + "\r\n")
print(f"wrote {len(os.listdir(out))} reminder files to {out}")
