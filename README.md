# Elixir

**CSCI 202 Final Project: Programming Language Deep Dive**
November 2026

 The project has three parts: a research paper, a slide
deck for the live presentation, and an interactive tutorial website.

## Links

| | |
|---|---|
| **Website** | https://elegant-empanada-06d54a.netlify.app/ |
| **Website, backup copy (GitHub)** | https://github.com/CornOnTheKob/elixir-on-the-beam (download it, then open `index.html` in a browser) |
| **Slides (Canva)** | https://canva.link/3ldvoqgf9he1nnn |
| **All project files (Google Drive)** | https://drive.google.com/drive/folders/1pU3ZKCQqO8tShqRo3HI1u3eWAXswnoln?usp=sharing |

## Members

| Name | Contribution |
|---|---|
| **Jacob Lorenzo A. Cano** | Led the project; drafted the paper, the tutorial website and the slides |
| **Michelle Kim Angela C. Abarico** | Added content to all three; reviewed and edited them |

## What the project covers

### 1. The paper
*Elixir on the BEAM: Lineage, Language Design, and a Comparative Analysis with Erlang*:
a 10-page, two-column arXiv-style paper built around four research questions.
- **Lineage:** Elixir's documented influences (Erlang, Ruby, Clojure) and older ideas behind them
  (the λ-calculus, Lisp, Prolog, Smalltalk, the Actor model).
- **Language design:** what Elixir adds (rebinding, the pipe, strings, macros, protocols, gradual
  types) and what it inherits from the BEAM and OTP (processes, isolation, supervision).
- **Comparison with Erlang:** a compiler check, plus two benchmarks (process spawning and memory;
  message passing around a ring).
- **Elixir in production:** industrial case studies such as Discord, Pinterest and Bleacher Report.

### 2. The slide deck
*Elixir on the BEAM: an introduction to Elixir, and what it inherits from Erlang*: the deck for the presentation. It runs from a Discord hook through
Elixir's roots, a hands-on tour, what Elixir adds, the engine it inherits, the benchmark and
real-world use, to a four-answer wrap-up. Key terms (pattern matching, rebinding, preemptive
scheduling and others) are labelled on the slides.

### 3. The tutorial website
An interactive web article that teaches Elixir from zero:
- **Roots:** a scroll-driven reveal of Elixir's family tree.
- **So, what is Elixir?** and **How to install Elixir**, with copy-and-paste terminal commands.
- **Inside:** an isometric explorer showing which layer (Elixir, OTP or the BEAM) does the work.
- **Demos and exercises:** a laptop that opens on scroll and runs eight demos and nine exercises.
- **The paper:** a download link and links to both members' sites.

Every code output on the site and in the slides is a real run on Elixir 1.20.4 with Erlang/OTP 29.

---

## Website source

This folder is the website itself: a static site with no build step and no framework. Open
`index.html` in a browser, or publish the folder as it is.

### What's on the page

| Section | What happens |
|---|---|
| **01 · Roots** | A drop-shaped window is cut into the white hero. Scrolling grows it until the night scene behind fills the screen (a mask reveal). The camera then moves across Elixir's family tree in four steps. The names, years and arrows are copied from the paper's Figure 1. |
| **So, what is Elixir?** | A short beginner's introduction between the history and chapter 02: the official one-line definition, three habits of writing Elixir (transform data, tiny processes, let it crash) and four numbers, set in an editorial style (an italic Source Serif 4 accent, hairlines instead of boxes). |
| **How to install Elixir** | Four magazine-style steps (install, check, play in `iex`, start a project), each with a terminal and a *Copy* button that copies the commands only. Step 1 has macOS / Windows / Linux tabs with the commands from elixir-lang.org/install; steps 2–4 show real recorded output. |
| **02 · Inside** | An isometric explorer with four stations: your code, the Elixir compiler, OTP and the BEAM. The floor is split into compile time and run time. Six situations play step by step, and the inspector shows a recorded output at every step. |
| **03 · Demos** | A laptop opens as you scroll, and each further scroll runs the next item on its screen: eight demos, then nine exercises from very basic to medium (variables and strings, basic math, first functions, function clauses, recursion, FizzBuzz, maps and the pipe, tagged tuples, processes). The laptop's sidebar lists both groups, *Demos* and *Exercises*, and jumps to any item. Exercises work like the demos: the task, the worked solution, its real output, and a short explanation of how it works. On phones the screen pops out into a full-width card. |

