"""Builds assets/js/data.js: every code sample and every output the site shows.

usage:  python3 -I demos/build_data.py        (from the elixir-website folder)

Nothing in data.js is typed by hand. This script
  1. runs the website's own demo scripts in demos/ with `elixir` and records
     what they print (stdout and stderr, exactly as printed), and
  2. reads the transcripts, sources and results the paper already recorded in
     ../elixir-paper/ (demos/, bench/) and the deck's demo outputs
     (../elixir-deck/demos/out/).
Long stack traces are trimmed and the trim is marked in the output itself.
Tested with Elixir 1.20.4 on Erlang/OTP 29.
"""
import json, os, re, subprocess, sys
from datetime import date
from pathlib import Path

SITE = Path(__file__).resolve().parent.parent
DEMOS = SITE / "demos"
PAPER = SITE.parent / "elixir-paper"
DECK = SITE.parent / "elixir-deck"
ENV = dict(os.environ, LC_ALL="en_US.UTF-8", LANG="en_US.UTF-8", ELIXIR_ERL_OPTIONS="+fnu")


def run(*cmd, cwd=DEMOS):
    """Run a command and return everything it printed (stdout + stderr)."""
    p = subprocess.run(cmd, cwd=cwd, env=ENV, capture_output=True, text=True)
    return (p.stdout + p.stderr).rstrip("\n")


def read(path):
    return Path(path).read_text(encoding="utf-8").rstrip("\n")


def lib_form(name):
    """One top-level form (defmodule/defprotocol/defimpl ... end) from the paper's lib.exs."""
    text = read(PAPER / "demos" / "lib.exs")
    m = re.search(rf"^(defmodule|defprotocol) {name} do\n.*?^end$", text, re.S | re.M)
    if not m:
        sys.exit(f"lib.exs: {name} not found")
    return m.group(0)


TRACE = re.compile(r"^\s+(\([\w ]+[\d.]+\) |[\w./-]+\.(exs?|erl):\d+)")


def trim_traces(text):
    """Replace each run of stack-trace lines with one marked line."""
    out, in_trace = [], False
    for line in text.splitlines():
        if TRACE.match(line):
            if not in_trace:
                out.append("    … (stack trace trimmed)")
            in_trace = True
            continue
        in_trace = False
        out.append(line)
    return "\n".join(out)


def first_block(text):
    return text.strip().split("\n\n")[0]


version = run("elixir", "--version").splitlines()[-1]

src, out = {}, {}

# ---- pattern matching (website scripts)
for k in ("matching_fits", "matching_nofit"):
    src[k] = read(DEMOS / f"{k}.exs")
    out[k] = run("elixir", f"{k}.exs")

# ---- rebinding (paper demo d1: iex and erl transcripts)
out["rebinding_iex"] = read(PAPER / "demos/d1-rebinding/elixir-transcript.txt")
out["rebinding_erl"] = read(PAPER / "demos/d1-rebinding/erlang-transcript.txt")

# ---- pipe (paper demo d3 + the website's nested version)
src["pipe"] = read(PAPER / "demos/d3-pipe/pipeline.exs")
out["pipe"] = run("elixir", "d3-pipe/pipeline.exs", cwd=PAPER / "demos")
src["pipe_nested"] = read(DEMOS / "pipe_nested.exs")
out["pipe_nested"] = run("elixir", "pipe_nested.exs")

# ---- processes and messages (paper demo d5)
src["counter"] = lib_form("Counter")
out["messages_iex"] = read(PAPER / "demos/d5-messages/elixir-transcript.txt")

# ---- let it crash (paper demo d4)
src["stack"] = lib_form("Stack")
src["restart"] = read(PAPER / "demos/d4-supervisor/restart.exs")
raw = run("elixir", "-r", "lib.exs", "d4-supervisor/restart.exs", cwd=PAPER / "demos")
out["restart"] = trim_traces(raw)

# ---- macros (paper demo d6)
src["my_macro"] = lib_form("My")
out["macros_iex"] = read(PAPER / "demos/d6-quote/elixir-transcript.txt")

# ---- protocols (website demo, recorded as an iex session like the paper's demos)
src["protocols"] = read(DEMOS / "protocols_defs.exs")
raw = run("sh", "-c", "iex protocols_defs.exs < protocols_input.txt")
(DEMOS / "protocols-raw.txt").write_text(raw + "\n", encoding="utf-8")
subprocess.run([sys.executable, "-I", str(PAPER / "demos/transcript.py"), "iex", "protocols_input.txt",
                "protocols-raw.txt", "protocols-transcript.txt"], cwd=DEMOS, env=ENV, capture_output=True, check=True)
out["protocols_iex"] = read(DEMOS / "protocols-transcript.txt")

# ---- gradual types (paper's types demo; output.txt is the paper's hand-abridged copy)
src["shop"] = read(PAPER / "demos/types/shop.ex")
out["types"] = read(PAPER / "demos/types/output.txt")

# ---- compiler check, benchmark and scheduling results (paper bench/, deck demos)
zc = read(PAPER / "bench/zerocost.txt").splitlines()
out["zerocost"] = zc
zsrc = read(PAPER / "bench/zerocost.exs")
src["zc_pipe"] = re.search(r'def f\(xs\), do: (xs \|>[^"]+)\\nend', zsrc).group(1)
src["zc_nested"] = re.search(r'def f\(xs\), do: (Enum\.sum[^"]+)\\nend', zsrc).group(1)
macros = dict(re.findall(r"\\newcommand\{\\(\w+)\}\{([^}]*)\}", read(PAPER / "bench/results-macros.tex")))
bench = {k: v.replace("--", "–") for k, v in macros.items()}
bsrc = read(PAPER / "bench/beam_bench.exs")
src["bench_spawn"] = re.search(r"for _ <- 1\.\.n, do: spawn\(.*?\) end\)", bsrc).group(0)
out["fair"] = first_block(read(DECK / "demos/out/fair.txt"))

# ---- the laptop's nine exercises (website scripts in demos/exercises/)
for name in ["hello", "math", "functions", "greet", "sum", "fizzbuzz", "cart", "divide", "pingpong"]:
    src["ex_" + name] = read(DEMOS / "exercises" / f"{name}.exs")
    out["ex_" + name] = run("elixir", f"{name}.exs", cwd=DEMOS / "exercises")

# ---- "How to install" section: real runs of the getting-started commands
import tempfile
INST = DEMOS / "install"
out["inst_version"] = run("elixir", "--version")
raw = run("sh", "-c", "iex < iex_input.txt", cwd=INST)
(INST / "iex-raw.txt").write_text(raw + "\n", encoding="utf-8")
subprocess.run([sys.executable, "-I", str(PAPER / "demos/transcript.py"), "iex", "iex_input.txt",
                "iex-raw.txt", "iex-transcript.txt"], cwd=INST, env=ENV, capture_output=True, check=True)
out["inst_iex"] = read(INST / "iex-transcript.txt")
with tempfile.TemporaryDirectory() as tmp:
    out["inst_new"] = run("mix", "new", "hello", cwd=tmp)
    out["inst_test"] = run("mix", "test", cwd=Path(tmp) / "hello")

# ---- the paper: the PDF offered for download, and page images for the closing section
import shutil
PDF = PAPER / "main.pdf"
shutil.copyfile(PDF, SITE / "assets/paper/elixir-on-the-beam.pdf")
IMG = SITE / "assets/img"
IMG.mkdir(exist_ok=True)
for page in (1, 3, 4):
    subprocess.run(["pdftoppm", "-f", str(page), "-l", str(page), "-r", "84", "-jpeg", "-jpegopt", "quality=84",
                    "-singlefile", str(PDF), str(IMG / f"paper-p{page}")], check=True)

data = {
    "version": version,
    "built": date.today().isoformat(),
    "src": src,
    "out": out,
    "bench": bench,
}
target = SITE / "assets/js/data.js"
target.write_text(
    "// Generated by demos/build_data.py -- do not edit by hand.\n"
    "window.ELIXIR_DATA = " + json.dumps(data, ensure_ascii=False, indent=1) + ";\n",
    encoding="utf-8",
)
print(f"wrote {target.relative_to(SITE)}  ({version})")
for k, v in out.items():
    first = (v[0] if isinstance(v, list) else v).splitlines()[0] if v else ""
    print(f"  {k:16} {first[:70]}")
