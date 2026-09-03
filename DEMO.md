import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Radio, Mic, Square, Volume2, VolumeX, Send, Loader2, Check,
  RefreshCw, BarChart3, Gamepad2, BookOpen, CloudUpload, Plug, X,
} from "lucide-react";

/* ------------------------------------------------------------------ *
 *  SIGNAL ROOM — practice English by transmitting the phrases you own
 *  Phrases come from your Language Learning MCP server (or paste them).
 * ------------------------------------------------------------------ */

const MCP_URL =
  "https://ye54rjqccqu7zc7ltlolrnnddu0usddj.lambda-url.eu-central-1.on.aws/6751ace5e4db5a3daae70220685c7c3c0b86fd8f22d3908e474328562cf215fc";

const SEED = [
  "bite the bullet", "a blessing in disguise", "cut corners",
  "the elephant in the room", "get your ducks in a row",
  "hit the nail on the head", "sit on the fence", "burn the midnight oil",
  "let the cat out of the bag", "a shot in the dark", "pull the plug",
  "give someone the benefit of the doubt", "off the top of my head",
  "come out of the woodwork", "a stone's throw away",
];

const GENRES = [
  { id: "noir", label: "Night desk", blurb: "A missing-person case in a rainy port city." },
  { id: "orbit", label: "Orbit", blurb: "A comms officer on a failing research station." },
  { id: "office", label: "Ninth floor", blurb: "Office politics at a company shipping something it shouldn't." },
  { id: "road", label: "Long road", blurb: "Hitchhiking across a country you don't quite understand." },
];

/* ------------------------------ API ------------------------------- */

async function claude(prompt, { mcp = false, maxTokens = 1000 } = {}) {
  const body = {
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  };
  if (mcp) body.mcp_servers = [{ type: "url", url: MCP_URL, name: "language-learning" }];

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "Request failed");
  const text = (data.content || [])
    .filter((b) => b.type === "text")
    .map((b) => b.text || "")
    .join("\n");
  const tool = (data.content || [])
    .filter((b) => b.type === "mcp_tool_result")
    .map((b) => (b.content || []).map((c) => c.text || "").join("\n"))
    .join("\n");
  return { text, tool };
}

function parseJSON(raw) {
  if (!raw) return null;
  const clean = raw.replace(/```json/g, "").replace(/```/g, "").trim();
  const s = clean.search(/[[{]/);
  if (s === -1) return null;
  const open = clean[s];
  const close = open === "{" ? "}" : "]";
  const e = clean.lastIndexOf(close);
  if (e === -1) return null;
  try { return JSON.parse(clean.slice(s, e + 1)); } catch { return null; }
}

const norm = (s) => (s || "").toLowerCase().replace(/[^a-z' ]/g, " ").replace(/\s+/g, " ").trim();

/* --------------------------- speech hooks -------------------------- */

function useDictation(onText) {
  const [listening, setListening] = useState(false);
  const ref = useRef(null);
  const supported = typeof window !== "undefined" &&
    !!(window.SpeechRecognition || window.webkitSpeechRecognition);

  const start = useCallback(() => {
    if (!supported) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const r = new SR();
    r.lang = "en-US";
    r.continuous = true;
    r.interimResults = false;
    r.onresult = (e) => {
      let out = "";
      for (let i = e.resultIndex; i < e.results.length; i++) out += e.results[i][0].transcript;
      onText(out.trim());
    };
    r.onend = () => setListening(false);
    r.onerror = () => setListening(false);
    ref.current = r;
    r.start();
    setListening(true);
  }, [onText, supported]);

  const stop = useCallback(() => { ref.current?.stop(); setListening(false); }, []);
  return { supported, listening, start, stop };
}

function speak(text, on) {
  if (!on || typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "en-US";
  u.rate = 0.98;
  window.speechSynthesis.speak(u);
}

/* ---------------------------- small UI ----------------------------- */

function Chip({ phrase, hit, onClick, dim }) {
  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`px-3 py-1.5 rounded-full border text-sm transition-all duration-500 ${
        hit
          ? "border-amber-300 bg-amber-300 text-slate-950 font-medium shadow-lg shadow-amber-300/20"
          : dim
          ? "border-slate-700 text-slate-500"
          : "border-amber-300 text-amber-200 hover:bg-amber-300 hover:text-slate-950"
      } ${onClick ? "cursor-pointer" : "cursor-default"}`}
    >
      {hit && <Check className="inline w-3.5 h-3.5 mr-1 -mt-0.5" />}
      {phrase}
    </button>
  );
}

function Meter({ value, max = 5 }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <span
          key={i}
          className={`h-3 w-1.5 rounded-sm transition-colors duration-500 ${
            i < value ? "bg-teal-300" : "bg-slate-700"
          }`}
        />
      ))}
    </div>
  );
}

function Narration({ text, voice }) {
  const [shown, setShown] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    const reduce = typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) { setShown(text); setDone(true); return; }
    setShown(""); setDone(false);
    let i = 0;
    const t = setInterval(() => {
      i += 3;
      setShown(text.slice(0, i));
      if (i >= text.length) { clearInterval(t); setDone(true); }
    }, 16);
    return () => clearInterval(t);
  }, [text]);
  useEffect(() => { speak(text, voice); /* eslint-disable-next-line */ }, [text]);
  return (
    <p
      onClick={() => { setShown(text); setDone(true); }}
      className="font-serif text-lg leading-relaxed text-stone-200 whitespace-pre-wrap"
    >
      {shown}
      {!done && <span className="inline-block w-2 h-5 bg-teal-300 ml-0.5 align-middle animate-pulse" />}
    </p>
  );
}

/* ============================== APP =============================== */

export default function SignalRoom() {
  const [phrases, setPhrases] = useState([]);      // {id,text,strength,reps}
  const [screen, setScreen] = useState("connect"); // connect | menu | story | arcade | progress
  const [voice, setVoice] = useState(false);
  const [log, setLog] = useState([]);              // session records
  const [syncNote, setSyncNote] = useState("");

  const due = phrases.filter((p) => p.strength < 5);
  const xp = log.reduce((a, s) => a + (s.xp || 0), 0);

  const bump = (texts, delta = 1) => {
    const set = new Set(texts.map(norm));
    setPhrases((ps) =>
      ps.map((p) =>
        set.has(norm(p.text))
          ? { ...p, strength: Math.max(0, Math.min(5, p.strength + delta)), reps: p.reps + 1 }
          : p
      )
    );
  };

  const record = (entry) => setLog((l) => [{ ...entry, at: Date.now() }, ...l]);

  const sync = async () => {
    setSyncNote("Sending…");
    const payload = phrases
      .filter((p) => p.reps > 0)
      .map((p) => ({ phrase: p.text, strength: p.strength, reviews: p.reps }));
    if (!payload.length) { setSyncNote("Nothing to send yet."); return; }
    try {
      await claude(
        `Use the available language-learning tools to record these practice results for the user. ` +
        `For each item, log a review of the phrase with the given strength (0-5 mastery) and review count. ` +
        `Results: ${JSON.stringify(payload)}. Reply with one short sentence confirming what you saved.`,
        { mcp: true }
      );
      setSyncNote(`Saved ${payload.length} results.`);
    } catch (e) {
      setSyncNote("Server didn't accept it — progress is still here in the session.");
    }
  };

  /* ------------------------- connect screen ------------------------ */
  if (screen === "connect") {
    return <Connect onReady={(list) => { setPhrases(list); setScreen("menu"); }} />;
  }

  const Header = (
    <header className="flex items-center justify-between mb-8 pb-4 border-b border-slate-800">
      <button onClick={() => setScreen("menu")} className="flex items-center gap-2 group">
        <Radio className="w-5 h-5 text-teal-300" />
        <span className="font-mono text-xs tracking-[0.25em] text-slate-400 group-hover:text-teal-300">
          SIGNAL ROOM
        </span>
      </button>
      <div className="flex items-center gap-4 font-mono text-xs text-slate-500">
        <span>{due.length} in rotation</span>
        <span className="text-amber-300">{xp} xp</span>
        <button onClick={() => setVoice(!voice)} title="Read scenes aloud"
          className={voice ? "text-teal-300" : "text-slate-600 hover:text-slate-400"}>
          {voice ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
        </button>
      </div>
    </header>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-stone-200 px-5 py-8 sm:px-8">
      <div className="max-w-3xl mx-auto">
        {Header}
        {screen === "menu" && (
          <Menu
            due={due} total={phrases.length} sessions={log.length}
            go={setScreen} sync={sync} syncNote={syncNote}
          />
        )}
        {screen === "story" && (
          <Story phrases={phrases} due={due} bump={bump} record={record} voice={voice} />
        )}
        {screen === "arcade" && (
          <Arcade phrases={phrases} due={due} bump={bump} record={record} />
        )}
        {screen === "progress" && <Progress phrases={phrases} log={log} />}
      </div>
    </div>
  );
}

/* --------------------------- connect ------------------------------ */

function Connect({ onReady }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [manual, setManual] = useState("");

  const make = (arr) =>
    Array.from(new Set(arr.map((s) => s.trim()).filter(Boolean)))
      .map((text, i) => ({ id: i, text, strength: 0, reps: 0 }));

  const pull = async () => {
    setBusy(true); setErr("");
    try {
      const { text, tool } = await claude(
        `Use the available language-learning tools to fetch the words, phrases and idioms that are due ` +
        `for review right now (up to 24; if the tool needs a count, ask for 24). ` +
        `Then reply with ONLY a JSON array of the phrase strings, e.g. ["bite the bullet","cut corners"]. ` +
        `No prose, no markdown, no explanation.`,
        { mcp: true, maxTokens: 1500 }
      );
      const arr = parseJSON(text) || parseJSON(tool);
      const list = Array.isArray(arr)
        ? arr.map((x) => (typeof x === "string" ? x : x?.phrase || x?.text || x?.word)).filter(Boolean)
        : [];
      if (!list.length) throw new Error("No phrases came back from the server.");
      onReady(make(list));
    } catch (e) {
      setErr(e.message + " Paste a list below, or start with the sample set.");
    }
    setBusy(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-stone-200 flex items-center px-5 py-12">
      <div className="max-w-xl mx-auto w-full">
        <div className="flex items-center gap-2 mb-10">
          <Radio className="w-5 h-5 text-teal-300" />
          <span className="font-mono text-xs tracking-[0.25em] text-slate-400">SIGNAL ROOM</span>
        </div>

        <h1 className="font-serif text-4xl leading-tight mb-3">
          Your phrases go out <span className="text-amber-300">on the air</span>.
        </h1>
        <p className="text-slate-400 mb-10 leading-relaxed">
          Every scene hides three of your collected phrases. Get them into your reply and the signal
          locks. Nothing to grade, nothing to configure — just talk your way through.
        </p>

        <button
          onClick={pull} disabled={busy}
          className="w-full flex items-center justify-center gap-2 bg-teal-300 text-slate-950 font-medium py-3 rounded-lg hover:bg-teal-200 disabled:opacity-50"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plug className="w-4 h-4" />}
          {busy ? "Reading your collection…" : "Load my phrases from the server"}
        </button>
        {err && <p className="mt-3 text-sm text-amber-300">{err}</p>}

        <div className="mt-8 pt-8 border-t border-slate-800">
          <label className="font-mono text-xs tracking-widest text-slate-500 block mb-2">
            OR PASTE A LIST — ONE PER LINE
          </label>
          <textarea
            value={manual} onChange={(e) => setManual(e.target.value)} rows={5}
            placeholder={"a shot in the dark\nburn the midnight oil"}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg p-3 text-sm text-stone-200 placeholder-slate-600 focus:outline-none focus:border-teal-300"
          />
          <div className="flex gap-3 mt-3">
            <button
              onClick={() => onReady(make(manual.split("\n")))}
              disabled={!manual.trim()}
              className="flex-1 border border-slate-700 rounded-lg py-2.5 text-sm hover:border-teal-300 hover:text-teal-300 disabled:opacity-40"
            >
              Use these
            </button>
            <button
              onClick={() => onReady(make(SEED))}
              className="flex-1 border border-slate-700 rounded-lg py-2.5 text-sm text-slate-400 hover:border-slate-500"
            >
              Start with the sample set
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ----------------------------- menu ------------------------------- */

function Menu({ due, total, sessions, go, sync, syncNote }) {
  const card = "text-left border border-slate-800 rounded-xl p-5 hover:border-teal-300 transition-colors bg-slate-900";
  return (
    <div>
      <div className="grid sm:grid-cols-3 gap-4 mb-10 font-mono text-xs">
        <div className="border border-slate-800 rounded-lg p-4">
          <div className="text-3xl font-sans text-teal-300">{due.length}</div>
          <div className="text-slate-500 mt-1">PHRASES IN ROTATION</div>
        </div>
        <div className="border border-slate-800 rounded-lg p-4">
          <div className="text-3xl font-sans text-stone-200">{total - due.length}</div>
          <div className="text-slate-500 mt-1">RETIRED</div>
        </div>
        <div className="border border-slate-800 rounded-lg p-4">
          <div className="text-3xl font-sans text-stone-200">{sessions}</div>
          <div className="text-slate-500 mt-1">SESSIONS</div>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <button onClick={() => go("story")} className={card}>
          <BookOpen className="w-5 h-5 text-amber-300 mb-3" />
          <div className="font-medium mb-1">Story</div>
          <p className="text-sm text-slate-400">
            A scene unfolds, you answer in character. Three phrases hidden in every beat.
          </p>
        </button>
        <button onClick={() => go("arcade")} className={card}>
          <Gamepad2 className="w-5 h-5 text-amber-300 mb-3" />
          <div className="font-medium mb-1">Drills</div>
          <p className="text-sm text-slate-400">
            Three minutes: fill the gaps, describe without saying it, smuggle three into one message.
          </p>
        </button>
        <button onClick={() => go("progress")} className={card}>
          <BarChart3 className="w-5 h-5 text-amber-300 mb-3" />
          <div className="font-medium mb-1">Progress</div>
          <p className="text-sm text-slate-400">Which phrases are landing, which keep slipping.</p>
        </button>
        <button onClick={sync} className={card}>
          <CloudUpload className="w-5 h-5 text-amber-300 mb-3" />
          <div className="font-medium mb-1">Save to my server</div>
          <p className="text-sm text-slate-400">{syncNote || "Push this session's results back to your database."}</p>
        </button>
      </div>
    </div>
  );
}

/* ----------------------------- story ------------------------------ */

function Story({ phrases, due, bump, record, voice }) {
  const [genre, setGenre] = useState(null);
  const [scene, setScene] = useState("");
  const [targets, setTargets] = useState([]);   // {text, hit}
  const [history, setHistory] = useState([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const [beats, setBeats] = useState(0);
  const [recap, setRecap] = useState(null);
  const [notes, setNotes] = useState([]);
  const scores = useRef([]);

  const dict = useDictation((t) => setDraft((d) => (d ? d + " " + t : t)));

  const pick = (n) => {
    const pool = due.length ? due : phrases;
    return [...pool].sort((a, b) => a.strength - b.strength || Math.random() - 0.5)
      .slice(0, Math.min(n * 2, pool.length))
      .sort(() => Math.random() - 0.5).slice(0, n).map((p) => p.text);
  };

  const begin = async (g) => {
    setGenre(g); setBusy(true);
    const t = pick(3);
    try {
      const { text } = await claude(
        `You run an interactive story for an advanced English learner. Setting: ${g.blurb}\n` +
        `Write the opening beat: 3-4 sentences, second person, present tense, concrete and atmospheric, ` +
        `ending on a moment that demands a spoken response from the reader. Do not mention English or learning.\n` +
        `Reply with ONLY JSON: {"scene":"..."}`
      );
      const j = parseJSON(text);
      setScene(j?.scene || "The room is quiet. Someone is waiting for you to speak first.");
      setTargets(t.map((x) => ({ text: x, hit: false })));
    } catch { setScene("Connection trouble. Try again."); }
    setBusy(false);
  };

  const send = async () => {
    if (!draft.trim() || busy) return;
    setBusy(true);
    const reply = draft.trim();
    setDraft(""); dict.stop();
    const open = targets.filter((t) => !t.hit).map((t) => t.text);
    try {
      const { text } = await claude(
        `Interactive story, setting: ${genre.blurb}\n` +
        `Recent beats: ${JSON.stringify(history.slice(-3))}\n` +
        `Current scene: ${scene}\n` +
        `The reader replied: "${reply}"\n` +
        `Their hidden objectives were these phrases: ${JSON.stringify(open)}\n\n` +
        `1. Decide which objectives they actually used, with roughly correct meaning (accept ` +
        `natural inflection and tense changes).\n` +
        `2. Continue the story: 3-4 sentences, second person, present tense, reacting to what they ` +
        `said, ending on a new hook. Never mention the objectives or grade them in the story.\n` +
        `3. Rate their sentence privately 0-5 on grammar, vocabulary range and naturalness.\n` +
        `4. If one thing was clearly off, write a single short correction line; otherwise "".\n\n` +
        `Reply with ONLY JSON: {"used":["..."],"scene":"...","grammar":0,"vocabulary":0,"naturalness":0,"note":""}`,
        { maxTokens: 1200 }
      );
      const j = parseJSON(text) || {};
      const used = (j.used || []).filter((u) => open.some((o) => norm(o) === norm(u)));
      if (used.length) bump(used, 1);
      setTargets((ts) => ts.map((t) => (used.some((u) => norm(u) === norm(t.text)) ? { ...t, hit: true } : t)));
      if (j.note) setNotes((n) => [...n, j.note]);
      scores.current.push([j.grammar || 0, j.vocabulary || 0, j.naturalness || 0]);
      setHistory((h) => [...h, { you: reply, scene: j.scene }]);
      setScene(j.scene || scene);
      setBeats((b) => b + 1);

      const remaining = targets.filter((t) => !t.hit && !used.some((u) => norm(u) === norm(t.text)));
      if (!remaining.length) {
        const next = pick(3).filter((x) => !targets.some((t) => norm(t.text) === norm(x)));
        if (next.length) setTargets(next.map((x) => ({ text: x, hit: false })));
      }
    } catch { setNotes((n) => [...n, "Lost the connection on that one — say it again."]); }
    setBusy(false);
  };

  const finish = () => {
    const n = scores.current.length || 1;
    const avg = scores.current.reduce((a, s) => [a[0] + s[0], a[1] + s[1], a[2] + s[2]], [0, 0, 0]).map((v) => (v / n).toFixed(1));
    const hits = targets.filter((t) => t.hit).length;
    record({ mode: "story", xp: beats * 10 + hits * 15, beats, avg });
    setRecap({ avg, beats, notes });
  };

  if (!genre) {
    return (
      <div>
        <h2 className="font-serif text-3xl mb-2">Pick a world</h2>
        <p className="text-slate-400 mb-8">You'll stay in it as long as you like. Your phrases arrive as objectives.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          {GENRES.map((g) => (
            <button key={g.id} onClick={() => begin(g)}
              className="text-left border border-slate-800 bg-slate-900 rounded-xl p-5 hover:border-amber-300">
              <div className="font-mono text-xs tracking-widest text-amber-300 mb-2">{g.label.toUpperCase()}</div>
              <p className="text-sm text-slate-400">{g.blurb}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (recap) {
    return (
      <div>
        <h2 className="font-serif text-3xl mb-6">Session closed</h2>
        <div className="grid grid-cols-3 gap-4 mb-8 font-mono text-xs">
          {["GRAMMAR", "VOCABULARY", "NATURALNESS"].map((l, i) => (
            <div key={l} className="border border-slate-800 rounded-lg p-4">
              <div className="text-3xl font-sans text-teal-300">{recap.avg[i]}</div>
              <div className="text-slate-500 mt-1">{l}</div>
            </div>
          ))}
        </div>
        {recap.notes.length > 0 && (
          <div className="border border-slate-800 rounded-xl p-5 mb-8">
            <div className="font-mono text-xs tracking-widest text-slate-500 mb-3">WORTH A LOOK</div>
            <ul className="space-y-2 text-sm text-stone-300">
              {recap.notes.map((n, i) => <li key={i} className="flex gap-2"><span className="text-amber-300">·</span>{n}</li>)}
            </ul>
          </div>
        )}
        <button onClick={() => { setRecap(null); setGenre(null); setBeats(0); scores.current = []; setNotes([]); setHistory([]); }}
          className="border border-slate-700 rounded-lg px-5 py-2.5 text-sm hover:border-teal-300 hover:text-teal-300">
          New world
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-6">
        {targets.map((t) => <Chip key={t.text} phrase={t.text} hit={t.hit} />)}
      </div>

      <div className="border-l-2 border-slate-800 pl-5 mb-6 min-h-24">
        {busy && !scene ? (
          <Loader2 className="w-5 h-5 animate-spin text-teal-300" />
        ) : (
          <Narration text={scene} voice={voice} />
        )}
      </div>

      <div className="relative">
        <textarea
          value={draft} onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send(); }}
          rows={3} placeholder="Say something…"
          className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 pr-24 text-stone-200 placeholder-slate-600 focus:outline-none focus:border-teal-300"
        />
        <div className="absolute right-3 bottom-4 flex gap-2">
          {dict.supported && (
            <button onClick={() => (dict.listening ? dict.stop() : dict.start())}
              className={`p-2 rounded-lg ${dict.listening ? "bg-amber-300 text-slate-950" : "text-slate-500 hover:text-teal-300"}`}>
              {dict.listening ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>
          )}
          <button onClick={send} disabled={busy || !draft.trim()}
            className="p-2 rounded-lg bg-teal-300 text-slate-950 disabled:opacity-30">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex justify-between items-center mt-4 font-mono text-xs text-slate-600">
        <span>beat {beats + 1} · ⌘↵ to send</span>
        <button onClick={finish} className="hover:text-amber-300">end session →</button>
      </div>
    </div>
  );
}

/* ----------------------------- drills ----------------------------- */

function Arcade({ phrases, due, bump, record }) {
  const [game, setGame] = useState(null);
  const pool = due.length >= 4 ? due : phrases;

  const games = [
    { id: "cloze", name: "Gaps", blurb: "A short scene with your phrases cut out. Put them back." },
    { id: "taboo", name: "Describe it", blurb: "Explain a phrase without using its words. I guess which one." },
    { id: "smuggle", name: "Smuggle", blurb: "Work three phrases into one natural message." },
  ];

  if (!game) {
    return (
      <div>
        <h2 className="font-serif text-3xl mb-2">Short drills</h2>
        <p className="text-slate-400 mb-8">For the days you don't have a session in you.</p>
        <div className="grid sm:grid-cols-3 gap-4">
          {games.map((g) => (
            <button key={g.id} onClick={() => setGame(g.id)}
              className="text-left border border-slate-800 bg-slate-900 rounded-xl p-5 hover:border-amber-300">
              <div className="font-mono text-xs tracking-widest text-amber-300 mb-2">{g.name.toUpperCase()}</div>
              <p className="text-sm text-slate-400">{g.blurb}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  const back = (
    <button onClick={() => setGame(null)} className="font-mono text-xs text-slate-500 hover:text-teal-300 mb-6 flex items-center gap-1">
      <X className="w-3 h-3" /> back to drills
    </button>
  );

  return (
    <div>
      {back}
      {game === "cloze" && <Cloze pool={pool} bump={bump} record={record} />}
      {game === "taboo" && <Taboo pool={pool} bump={bump} record={record} />}
      {game === "smuggle" && <Smuggle pool={pool} bump={bump} record={record} />}
    </div>
  );
}

function Cloze({ pool, bump, record }) {
  const [data, setData] = useState(null);
  const [fills, setFills] = useState([]);
  const [busy, setBusy] = useState(false);
  const [checked, setChecked] = useState(false);

  const load = async () => {
    setBusy(true); setChecked(false);
    const picks = [...pool].sort(() => Math.random() - 0.5).slice(0, 4).map((p) => p.text);
    try {
      const { text } = await claude(
        `Write a single vivid paragraph (5-6 sentences) that naturally uses each of these phrases exactly once: ` +
        `${JSON.stringify(picks)}. Then replace each of those phrases in the paragraph with the token ___ .\n` +
        `Reply with ONLY JSON: {"story":"paragraph with ___ tokens","answers":["phrase for first ___","..."]}`
      );
      const j = parseJSON(text);
      if (j?.story) {
        setData({ ...j, bank: [...j.answers].sort(() => Math.random() - 0.5) });
        setFills(new Array(j.answers.length).fill(null));
      }
    } catch { /* ignore */ }
    setBusy(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  if (busy || !data) return <Loader2 className="w-5 h-5 animate-spin text-teal-300" />;

  const place = (ph) => {
    const i = fills.indexOf(null);
    if (i === -1) return;
    const next = [...fills]; next[i] = ph; setFills(next);
  };
  const clear = (i) => { const n = [...fills]; n[i] = null; setFills(n); };
  const parts = data.story.split("___");

  const check = () => {
    setChecked(true);
    const right = fills.filter((f, i) => norm(f) === norm(data.answers[i]));
    bump(right, 1);
    record({ mode: "gaps", xp: right.length * 10 });
  };

  return (
    <div>
      <p className="font-serif text-lg leading-loose text-stone-200 mb-8">
        {parts.map((seg, i) => (
          <React.Fragment key={i}>
            {seg}
            {i < parts.length - 1 && (
              <button onClick={() => clear(i)} disabled={checked}
                className={`mx-1 px-2 py-0.5 rounded border-b-2 font-sans text-base ${
                  checked
                    ? norm(fills[i]) === norm(data.answers[i])
                      ? "border-teal-300 text-teal-300" : "border-red-400 text-red-400 line-through"
                    : fills[i] ? "border-amber-300 text-amber-200" : "border-slate-600 text-slate-600"
                }`}>
                {fills[i] || "\u00A0\u00A0\u00A0\u00A0\u00A0\u00A0"}
              </button>
            )}
          </React.Fragment>
        ))}
      </p>

      {!checked ? (
        <>
          <div className="flex flex-wrap gap-2 mb-6">
            {data.bank.map((b) => (
              <Chip key={b} phrase={b} dim={fills.includes(b)} onClick={() => !fills.includes(b) && place(b)} />
            ))}
          </div>
          <button onClick={check} disabled={fills.includes(null)}
            className="bg-teal-300 text-slate-950 rounded-lg px-5 py-2.5 text-sm font-medium disabled:opacity-30">
            Check
          </button>
        </>
      ) : (
        <div>
          <p className="text-sm text-slate-400 mb-4">
            {fills.filter((f, i) => norm(f) === norm(data.answers[i])).length} of {data.answers.length} in the right place.
          </p>
          <button onClick={load} className="border border-slate-700 rounded-lg px-5 py-2.5 text-sm hover:border-teal-300 hover:text-teal-300 flex items-center gap-2">
            <RefreshCw className="w-4 h-4" /> Another one
          </button>
        </div>
      )}
    </div>
  );
}

function Taboo({ pool, bump, record }) {
  const [target, setTarget] = useState(null);
  const [desc, setDesc] = useState("");
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const dict = useDictation((t) => setDesc((d) => (d ? d + " " + t : t)));

  const next = () => {
    setTarget([...pool].sort(() => Math.random() - 0.5)[0]);
    setDesc(""); setResult(null);
  };
  useEffect(() => { next(); /* eslint-disable-next-line */ }, []);

  const guess = async () => {
    setBusy(true);
    try {
      const { text } = await claude(
        `Candidate phrases: ${JSON.stringify(pool.map((p) => p.text))}\n` +
        `Someone described one of them without using its words: "${desc}"\n` +
        `Which phrase did they mean? Reply with ONLY JSON: {"guess":"exact phrase from the list","note":"one short line on how clear the description was"}`
      );
      const j = parseJSON(text) || {};
      const ok = norm(j.guess) === norm(target.text);
      if (ok) bump([target.text], 1);
      record({ mode: "describe", xp: ok ? 15 : 0 });
      setResult({ ok, guess: j.guess, note: j.note });
    } catch { setResult({ ok: false, guess: "—", note: "Connection dropped." }); }
    setBusy(false);
  };

  if (!target) return null;

  return (
    <div>
      <div className="font-mono text-xs tracking-widest text-slate-500 mb-3">EXPLAIN THIS, WITHOUT ITS WORDS</div>
      <div className="font-serif text-3xl text-amber-300 mb-8">{target.text}</div>

      {!result ? (
        <div className="relative">
          <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3}
            placeholder="It's what you say when…"
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 pr-24 text-stone-200 placeholder-slate-600 focus:outline-none focus:border-teal-300" />
          <div className="absolute right-3 bottom-4 flex gap-2">
            {dict.supported && (
              <button onClick={() => (dict.listening ? dict.stop() : dict.start())}
                className={`p-2 rounded-lg ${dict.listening ? "bg-amber-300 text-slate-950" : "text-slate-500 hover:text-teal-300"}`}>
                {dict.listening ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}
            <button onClick={guess} disabled={busy || !desc.trim()}
              className="p-2 rounded-lg bg-teal-300 text-slate-950 disabled:opacity-30">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-lg mb-2">
            <span className="text-slate-500">I'd say you meant </span>
            <span className={result.ok ? "text-teal-300" : "text-red-400"}>{result.guess}</span>
          </p>
          <p className="text-sm text-slate-400 mb-6">{result.note}</p>
          <button onClick={next} className="border border-slate-700 rounded-lg px-5 py-2.5 text-sm hover:border-teal-300 hover:text-teal-300">
            Next phrase
          </button>
        </div>
      )}
    </div>
  );
}

function Smuggle({ pool, bump, record }) {
  const [picks, setPicks] = useState([]);
  const [msg, setMsg] = useState("");
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const dict = useDictation((t) => setMsg((m) => (m ? m + " " + t : t)));

  const next = () => {
    setPicks([...pool].sort(() => Math.random() - 0.5).slice(0, 3).map((p) => p.text));
    setMsg(""); setRes(null);
  };
  useEffect(() => { next(); /* eslint-disable-next-line */ }, []);

  const check = async () => {
    setBusy(true);
    try {
      const { text } = await claude(
        `A learner had to work these three phrases into one natural message: ${JSON.stringify(picks)}\n` +
        `They wrote: "${msg}"\n` +
        `For each phrase say whether it appears and whether it is used with correct meaning and natural fit. ` +
        `Then write one friendly in-character reply to their message (2 sentences, no teaching).\n` +
        `Reply with ONLY JSON: {"results":[{"phrase":"...","ok":true,"note":"short"}],"reply":"..."}`
      );
      const j = parseJSON(text) || { results: [] };
      const good = (j.results || []).filter((r) => r.ok).map((r) => r.phrase);
      bump(good, 1);
      record({ mode: "smuggle", xp: good.length * 12 });
      setRes(j);
    } catch { setRes({ results: [], reply: "Connection dropped." }); }
    setBusy(false);
  };

  return (
    <div>
      <div className="font-mono text-xs tracking-widest text-slate-500 mb-3">ALL THREE, ONE MESSAGE</div>
      <div className="flex flex-wrap gap-2 mb-6">
        {picks.map((p) => {
          const r = res?.results?.find((x) => norm(x.phrase) === norm(p));
          return <Chip key={p} phrase={p} hit={r?.ok} dim={res && !r?.ok} />;
        })}
      </div>

      {!res ? (
        <div className="relative">
          <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={4}
            placeholder="Write it however you like — a text to a friend, a work update, a rant."
            className="w-full bg-slate-900 border border-slate-800 rounded-xl p-4 pr-24 text-stone-200 placeholder-slate-600 focus:outline-none focus:border-teal-300" />
          <div className="absolute right-3 bottom-4 flex gap-2">
            {dict.supported && (
              <button onClick={() => (dict.listening ? dict.stop() : dict.start())}
                className={`p-2 rounded-lg ${dict.listening ? "bg-amber-300 text-slate-950" : "text-slate-500 hover:text-teal-300"}`}>
                {dict.listening ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            )}
            <button onClick={check} disabled={busy || !msg.trim()}
              className="p-2 rounded-lg bg-teal-300 text-slate-950 disabled:opacity-30">
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="font-serif text-lg text-stone-200 mb-6">{res.reply}</p>
          <ul className="space-y-2 mb-6 text-sm">
            {(res.results || []).map((r) => (
              <li key={r.phrase} className="text-slate-400">
                <span className={r.ok ? "text-teal-300" : "text-amber-300"}>{r.phrase}</span> — {r.note}
              </li>
            ))}
          </ul>
          <button onClick={next} className="border border-slate-700 rounded-lg px-5 py-2.5 text-sm hover:border-teal-300 hover:text-teal-300">
            Three more
          </button>
        </div>
      )}
    </div>
  );
}

/* ---------------------------- progress ---------------------------- */

function Progress({ phrases, log }) {
  const sorted = [...phrases].sort((a, b) => b.strength - a.strength || b.reps - a.reps);
  const touched = phrases.filter((p) => p.reps > 0).length;

  return (
    <div>
      <h2 className="font-serif text-3xl mb-8">Where things stand</h2>

      <div className="grid grid-cols-3 gap-4 mb-10 font-mono text-xs">
        <div className="border border-slate-800 rounded-lg p-4">
          <div className="text-3xl font-sans text-teal-300">{touched}</div>
          <div className="text-slate-500 mt-1">PRACTISED</div>
        </div>
        <div className="border border-slate-800 rounded-lg p-4">
          <div className="text-3xl font-sans text-amber-300">{phrases.filter((p) => p.strength >= 5).length}</div>
          <div className="text-slate-500 mt-1">RETIRED</div>
        </div>
        <div className="border border-slate-800 rounded-lg p-4">
          <div className="text-3xl font-sans text-stone-200">{log.length}</div>
          <div className="text-slate-500 mt-1">ROUNDS</div>
        </div>
      </div>

      <div className="space-y-1">
        {sorted.map((p) => (
          <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-900">
            <span className={p.reps ? "text-stone-200" : "text-slate-600"}>{p.text}</span>
            <div className="flex items-center gap-3">
              <span className="font-mono text-xs text-slate-600">{p.reps || "—"}</span>
              <Meter value={p.strength} />
            </div>
          </div>
        ))}
      </div>

      {touched === 0 && (
        <p className="text-slate-500 mt-8 text-sm">Nothing practised yet. Start a story and the bars fill themselves.</p>
      )}
    </div>
  );
}
