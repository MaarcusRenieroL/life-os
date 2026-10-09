#!/usr/bin/env python3
"""Benchmarks local Ollama models on the two prompts the app really uses (email triage, quick capture).

  python3 scripts/ai-bench.py json qwen3.5:9b llama3.1:8b     # app-style JSON mode
  python3 scripts/ai-bench.py plain qwen3.5:9b                # no JSON mode (needed for Qwen 3.5 on Homebrew Ollama)
  OLLAMA_URL=http://127.0.0.1:11435 python3 scripts/ai-bench.py ...

Cases are synthetic; it scores valid JSON, the main decision and the extracted fields, plus speed."""
import json, os, sys, time, re, urllib.request, datetime as dt, statistics

HERE = os.path.dirname(os.path.abspath(__file__))
HOST = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434")
TODAY = dt.date(2026, 10, 9)  # a Friday
TZ = "Asia/Kolkata"
d = lambda n: (TODAY + dt.timedelta(days=n)).isoformat()

EMAIL_PROMPT = open(os.path.join(HERE, "ai-bench-email-prompt.txt")).read().replace("%s", TODAY.isoformat(), 1).replace("%s", TZ, 1)
CAPTURE_PROMPT = open(os.path.join(HERE, "ai-bench-capture-prompt.txt")).read().replace("%s", TODAY.isoformat(), 1).replace("%s", "Friday", 1)

def eq(path, want):
    def check(j):
        cur = j
        for p in path.split("."):
            cur = cur.get(p) if isinstance(cur, dict) else None
        return cur == want
    return check
def num(path, want):
    def check(j):
        cur = j
        for p in path.split("."):
            cur = cur.get(p) if isinstance(cur, dict) else None
        try: return abs(float(cur) - want) < 0.01
        except Exception: return False
    return check
def has(path, sub):
    def check(j):
        cur = j
        for p in path.split("."):
            cur = cur.get(p) if isinstance(cur, dict) else None
        return isinstance(cur, str) and sub.lower() in cur.lower()
    return check
def startswith(path, pre):
    def check(j):
        cur = j
        for p in path.split("."):
            cur = cur.get(p) if isinstance(cur, dict) else None
        return isinstance(cur, str) and cur.startswith(pre)
    return check

EMAIL = [
 ("HDFC Bank Cards <alerts@hdfcbank.net>", "Your HDFC credit card statement", "Dear customer, your statement for card ending 4821 is ready. Total amount due: Rs. 12,540.00. Minimum due: Rs. 630. Payment due date: 15 Oct 2026. Pay via NetBanking or UPI to avoid late fees.", "BILL", [num("bill.amount", 12540), eq("bill.dueDate", "2026-10-15")]),
 ("Netflix <info@mailer.netflix.com>", "Your Netflix membership renews soon", "Hi, your Netflix Standard plan (Rs. 649/month) will renew on 20 Oct 2026. No action needed. Manage your membership in Account settings.", "SUBSCRIPTION", [num("subscription.amount", 649), eq("subscription.billingCycle", "MONTHLY"), eq("subscription.nextBillingDate", "2026-10-20")]),
 ("Priya Nair <priya@acmecorp.com>", "Interview invite - Backend Engineer", "Hi, we would like to invite you for the technical interview on Tuesday 14 October 2026 at 3:30 PM IST over Google Meet (link below). The interview will take about 60 minutes. Please confirm.", "EVENT", [startswith("event.start", "2026-10-14T15:30")]),
 ("Zomato <offers@zomato.com>", "50% off on your next 3 orders!", "Hungry? Use code FEAST50 and get 50% off, up to Rs. 150, on your next three orders. Offer valid till Sunday. Terms apply.", "IGNORE", []),
 ("Axis Bank <alerts@axisbank.com>", "OTP for your transaction", "123456 is the OTP for your transaction of Rs. 2,000 at Amazon. Do not share this OTP with anyone. Valid for 5 minutes.", "IGNORE", []),
 ("HR Team <hr@globex.com>", "Action needed: upload signed offer letter", "Hello, congratulations again. Please upload your signed offer letter on the onboarding portal by 12 October 2026 so we can complete your joining formalities.", "TASK", [eq("task.dueDate", "2026-10-12")]),
 ("Swiggy <noreply@swiggy.in>", "Your order receipt", "Thanks for ordering! Order #48212 delivered. Total paid: Rs. 436 via UPI. We hope you enjoyed your meal.", "IGNORE", []),
 ("Amazon.in <shipment-tracking@amazon.in>", "Your package has shipped", "Your order of 'USB-C cable' has been shipped and will arrive by Monday. Track your package in Your Orders.", "IGNORE", []),
 ("Spotify <no-reply@spotify.com>", "Your Premium trial is ending", "Your free trial of Spotify Premium ends on 18 Oct 2026. After that you will be charged Rs. 119 per month unless you cancel.", "SUBSCRIPTION", [num("subscription.amount", 119), eq("subscription.billingCycle", "MONTHLY"), eq("subscription.nextBillingDate", "2026-10-18")]),
 ("IndiGo <noreply@goindigo.in>", "Booking confirmed: Bengaluru to Delhi", "Your flight 6E-203 from Bengaluru (BLR) to Delhi (DEL) departs on 25 Oct 2026 at 07:15 and arrives at 10:05. PNR: XK29LP.", "EVENT", [startswith("event.start", "2026-10-25T07:15")]),
 ("BESCOM <billing@bescom.in>", "Electricity bill for September", "Your electricity bill for September 2026 is Rs. 2,310. Last date of payment: 22 October 2026. Pay online to avoid disconnection charges.", "BILL", [num("bill.amount", 2310), eq("bill.dueDate", "2026-10-22")]),
 ("LinkedIn <notifications@linkedin.com>", "Rahul liked your post", "Rahul Verma and 4 others reacted to your post about your side project. See what they said.", "IGNORE", []),
 ("Dr. Mehta's Clinic <reception@mehtadental.in>", "Appointment reminder", "This is a reminder of your dental check-up tomorrow at 11:00 AM at Mehta Dental Clinic, Indiranagar. Please arrive 10 minutes early.", "EVENT", [startswith("event.start", "2026-10-10T11:00")]),
 ("Google <no-reply@accounts.google.com>", "Security alert: new sign-in", "A new sign-in to your Google Account on a Mac was detected. If this was you, you don't need to do anything.", "IGNORE", []),
 ("Namecheap <support@namecheap.com>", "Domain renewal notice", "Your domain life-os.dev will renew on 5 January 2027 for Rs. 1,299 per year. Auto-renew is on.", "SUBSCRIPTION", [num("subscription.amount", 1299), eq("subscription.billingCycle", "YEARLY")]),
 ("Ankit Rao <ankit@startupx.io>", "Quick question", "Hey, can you send me the updated resume and let me know which days next week work for a call? Need it before we submit your profile to the client.", "TASK", []),
]
CAPTURE = [
 ("spent 400 on groceries", "finance", [eq("finance.type", "DEBIT"), num("finance.amount", 400)]),
 ("got paid 50000 salary", "finance", [eq("finance.type", "CREDIT"), num("finance.amount", 50000)]),
 ("applied to Stripe for backend engineer", "job", [has("job.company", "stripe"), has("job.title", "backend")]),
 ("call the bank tomorrow", "task", [eq("task.dueDate", d(1))]),
 ("submit report by monday", "task", [eq("task.dueDate", d(3))]),
 ("dentist monday at 5pm", "task", [eq("task.dueDate", d(3)), eq("task.dueTime", "17:00")]),
 ("idea: add a dark mode toggle to the settings page", "note", []),
 ("paid 1200 for electricity bill", "finance", [eq("finance.type", "DEBIT"), num("finance.amount", 1200)]),
 ("renew passport urgent", "task", [lambda j: (j.get("task") or {}).get("priority") in ("URGENT", "HIGH")]),
 ("Zomato reached out about a frontend role", "job", [has("job.company", "zomato")]),
 ("the guest wifi password is blue-horizon-42", "note", []),
 ("refund of 349 from Amazon", "finance", [eq("finance.type", "CREDIT"), num("finance.amount", 349)]),
 ("buy milk on the 15th", "task", [eq("task.dueDate", "2026-10-15")]),
 ("read the book recommended by Dev: Designing Data-Intensive Applications", "note", []),
]

SCHEMA_EMAIL = {"type": "object", "properties": {"category": {"enum": ["TASK", "BILL", "EVENT", "SUBSCRIPTION", "IGNORE"]}, "confidence": {"enum": ["HIGH", "MEDIUM", "LOW"]}, "summary": {"type": "string"}, "task": {"type": ["object", "null"]}, "bill": {"type": ["object", "null"]}, "event": {"type": ["object", "null"]}, "subscription": {"type": ["object", "null"]}}, "required": ["category", "confidence", "summary", "task", "bill", "event", "subscription"]}
SCHEMA_CAPTURE = {"type": "object", "properties": {"module": {"enum": ["finance", "job", "task", "note"]}, "finance": {"type": ["object", "null"]}, "job": {"type": ["object", "null"]}, "task": {"type": ["object", "null"]}, "note": {"type": ["object", "null"]}}, "required": ["module", "finance", "job", "task", "note"]}

def chat(model, system, user, fmt, temp):
    body = {"model": model, "stream": False, "think": False, "keep_alive": "10m",
            "messages": [{"role": "system", "content": system}, {"role": "user", "content": user}]}
    if fmt is not None: body["format"] = fmt
    if temp is not None: body["options"] = {"temperature": temp}
    req = urllib.request.Request(HOST + "/api/chat", json.dumps(body).encode(), {"Content-Type": "application/json"})
    t = time.time()
    with urllib.request.urlopen(req, timeout=300) as r: out = json.load(r)
    return out["message"]["content"], time.time() - t

def parse(raw):
    s = raw.strip()
    s = re.sub(r"^```(?:json)?\s*|\s*```$", "", s)
    try:
        j = json.loads(s); return j if isinstance(j, dict) else None
    except Exception: return None

def run(model, mode):
    fmt_e = SCHEMA_EMAIL if mode == "schema" else (None if mode == "plain" else "json")
    fmt_c = SCHEMA_CAPTURE if mode == "schema" else (None if mode == "plain" else "json")
    res = {"valid": 0, "main": 0, "fields": [0, 0], "n": 0, "times": [], "fails": []}
    try: chat(model, "Reply with {}", "hi", None if mode == "plain" else "json", 0)  # warm up (load into memory)
    except Exception as e: return {"error": str(e)}
    for (frm, subj, body, want, checks) in EMAIL:
        raw, secs = chat(model, EMAIL_PROMPT, f"FROM: {frm}\nSUBJECT: {subj}\nBODY:\n{body}", fmt_e, 0.1)
        j = parse(raw); res["n"] += 1; res["times"].append(secs)
        if j is None: res["fails"].append(f"email '{subj[:25]}': invalid JSON"); continue
        res["valid"] += 1
        if j.get("category") == want: res["main"] += 1
        else: res["fails"].append(f"email '{subj[:25]}': got {j.get('category')} want {want}")
        for c in checks:
            res["fields"][1] += 1
            if j.get("category") == want and c(j): res["fields"][0] += 1
    for (text, want, checks) in CAPTURE:
        raw, secs = chat(model, CAPTURE_PROMPT, text, fmt_c, None)
        j = parse(raw); res["n"] += 1; res["times"].append(secs)
        if j is None: res["fails"].append(f"capture '{text[:25]}': invalid JSON"); continue
        res["valid"] += 1
        if j.get("module") == want: res["main"] += 1
        else: res["fails"].append(f"capture '{text[:25]}': got {j.get('module')} want {want}")
        for c in checks:
            res["fields"][1] += 1
            if j.get("module") == want and c(j): res["fields"][0] += 1
    return res

if __name__ == "__main__":
    mode = sys.argv[1]
    for model in sys.argv[2:]:
        r = run(model, mode)
        if "error" in r: print(f"{model:18} {mode:6} ERROR {r['error'][:80]}"); continue
        f0, f1 = r["fields"]
        print(f"{model:18} {mode:6} valid {r['valid']}/{r['n']}  decision {r['main']}/{r['n']}  fields {f0}/{f1}  avg {statistics.mean(r['times']):.1f}s  p90 {sorted(r['times'])[int(len(r['times'])*0.9)-1]:.1f}s", flush=True)
        for f in r["fails"][:6]: print("     -", f)
