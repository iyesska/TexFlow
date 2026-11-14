/**
 * A tolerant reader for BibTeX, shared by the browser, which lists and edits the
 * references, and the server, which hands them to Pandoc. Pandoc does the real
 * reading when it formats citations; this one finds entries, their keys and the
 * fields worth showing, and says where the text stops making sense.
 */

export interface BibEntry {
  /** Lower-cased: "article", "book"… */
  readonly type: string;
  readonly key: string;
  /** Field names lower-cased; values without their outer braces or quotes. */
  readonly fields: Readonly<Record<string, string>>;
  /** Where the entry starts (its "@") and ends (after its closing brace). */
  readonly start: number;
  readonly end: number;
  /** 1-based line of its "@". */
  readonly line: number;
}

export interface BibProblem {
  readonly line: number;
  readonly message: string;
}

export interface ScannedBibliography {
  readonly entries: readonly BibEntry[];
  /** @string and @preamble blocks, which entries may depend on. */
  readonly definitions: readonly { readonly start: number; readonly end: number }[];
  readonly problems: readonly BibProblem[];
}

const CLOSING: Readonly<Record<string, string>> = { "{": "}", "(": ")" };

/** Reads one BibTeX text. Never throws: what it cannot read becomes a problem. */
export function scanBibtex(text: string): ScannedBibliography {
  const entries: BibEntry[] = [];
  const definitions: { start: number; end: number }[] = [];
  const problems: BibProblem[] = [];
  const seen = new Set<string>();
  let position = 0;

  const lineAt = (offset: number) => {
    let line = 1;
    for (let index = 0; index < offset; index++) if (text[index] === "\n") line++;
    return line;
  };
  const skipSpace = () => {
    while (position < text.length && /\s/.test(text[position]!)) position++;
  };
  /** From an opening brace or quote, to just after its match; -1 if there is none. */
  const balancedEnd = (from: number): number => {
    const open = text[from];
    if (open === '"') {
      let depth = 0;
      for (let index = from + 1; index < text.length; index++) {
        const char = text[index];
        if (char === "\\") index++;
        else if (char === "{") depth++;
        else if (char === "}") depth--;
        else if (char === '"' && depth === 0) return index + 1;
      }
      return -1;
    }
    const close = CLOSING[open ?? ""];
    let depth = 0;
    for (let index = from; index < text.length; index++) {
      const char = text[index];
      if (char === "\\") index++;
      else if (char === open) depth++;
      else if (char === close && --depth === 0) return index + 1;
    }
    return -1;
  };
  /** Skips to the next "@" at the start of a line, after a problem. */
  const resync = () => {
    const next = text.slice(position).search(/\n\s*@/);
    position = next === -1 ? text.length : position + next + 1;
  };

  while (position < text.length) {
    const at = text.indexOf("@", position);
    if (at === -1) break;
    position = at + 1;
    const line = lineAt(at);
    const type = /^[A-Za-z]+/.exec(text.slice(position))?.[0]?.toLowerCase();
    if (!type) continue;
    position += type.length;
    skipSpace();
    const open = text[position];
    if (open !== "{" && open !== "(") {
      problems.push({ line, message: `Falta «{» después de @${type}.` });
      resync();
      continue;
    }
    const blockEnd = balancedEnd(position);
    if (blockEnd === -1) {
      problems.push({
        line,
        message: `La entrada @${type} no se cierra: falta una «}».`,
      });
      resync();
      continue;
    }
    if (type === "comment") {
      position = blockEnd;
      continue;
    }
    if (type === "string" || type === "preamble") {
      definitions.push({ start: at, end: blockEnd });
      position = blockEnd;
      continue;
    }

    const body = text.slice(position + 1, blockEnd - 1);
    const comma = body.indexOf(",");
    const key = (comma === -1 ? body : body.slice(0, comma)).trim();
    if (!key || /[\s{}"]/.test(key)) {
      problems.push({ line, message: `La entrada @${type} no tiene una clave válida.` });
      position = blockEnd;
      continue;
    }
    if (seen.has(key)) {
      problems.push({ line, message: `La clave «${key}» está repetida.` });
    }
    seen.add(key);
    const fields = readFields(comma === -1 ? "" : body.slice(comma + 1));
    if (fields === null) {
      problems.push({ line, message: `No se entienden los campos de «${key}».` });
    }
    entries.push({ type, key, fields: fields ?? {}, start: at, end: blockEnd, line });
    position = blockEnd;
  }

  return { entries, definitions, problems };
}

/** The fields of an entry's body, after its key; null when they cannot be read. */
function readFields(body: string): Record<string, string> | null {
  const fields: Record<string, string> = {};
  let index = 0;
  const skip = () => {
    while (index < body.length && /[\s,]/.test(body[index]!)) index++;
  };
  while (true) {
    skip();
    if (index >= body.length) return fields;
    const name = /^[A-Za-z][\w:.+-]*/.exec(body.slice(index))?.[0];
    if (!name) return null;
    index += name.length;
    while (/\s/.test(body[index] ?? "")) index++;
    if (body[index] !== "=") return null;
    index++;
    const parts: string[] = [];
    while (true) {
      while (/\s/.test(body[index] ?? "")) index++;
      const char = body[index];
      if (char === "{" || char === '"') {
        const end = valueEnd(body, index);
        if (end === -1) return null;
        parts.push(body.slice(index + 1, end - 1));
        index = end;
      } else {
        const bare = /^[\w:.+-]+/.exec(body.slice(index))?.[0];
        if (!bare) return null;
        parts.push(bare);
        index += bare.length;
      }
      while (/\s/.test(body[index] ?? "")) index++;
      if (body[index] !== "#") break;
      index++;
    }
    fields[name.toLowerCase()] = parts.join("");
  }
}

function valueEnd(body: string, from: number): number {
  const quoted = body[from] === '"';
  let depth = 0;
  for (let index = from; index < body.length; index++) {
    const char = body[index];
    if (char === "\\") index++;
    else if (char === "{") depth++;
    else if (char === "}") {
      depth--;
      if (!quoted && depth === 0) return index + 1;
    } else if (quoted && char === '"' && depth === 0 && index > from) return index + 1;
  }
  return -1;
}

/**
 * The keys a Markdown document cites, as Pandoc reads citations: [@key], [see @a; @b,
 * p. 3], @key in the text, -@key, and @{key with braces}. An address like
 * ana@example.com is not a citation.
 */
export function citedKeys(markdown: string): Set<string> {
  const keys = new Set<string>();
  const pattern =
    /(?<![\p{L}\p{N}_.@])-?@(?:\{([^{}]+)\}|([\p{L}\p{N}_](?:[\p{L}\p{N}_]|[:.#$%&\-+?<>~/](?=[\p{L}\p{N}_]))*))/gu;
  for (const match of markdown.matchAll(pattern)) keys.add(match[1] ?? match[2]!);
  return keys;
}

/**
 * The part of a bibliography a document needs: the entries it cites, and the
 * definitions they may use. Empty when it cites nothing the bibliography has.
 */
export function bibliographyFor(markdown: string, bibtex: string): string {
  if (!bibtex.trim()) return "";
  const cited = citedKeys(markdown);
  if (cited.size === 0) return "";
  const scanned = scanBibtex(bibtex);
  const used = scanned.entries.filter(({ key }) => cited.has(key));
  if (used.length === 0) return "";
  return [...scanned.definitions, ...used]
    .map(({ start, end }) => bibtex.slice(start, end))
    .join("\n\n");
}

const ACCENTS: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  "'": {
    a: "á",
    e: "é",
    i: "í",
    o: "ó",
    u: "ú",
    A: "Á",
    E: "É",
    I: "Í",
    O: "Ó",
    U: "Ú",
    y: "ý",
    c: "ć",
    n: "ń",
  },
  "`": { a: "à", e: "è", i: "ì", o: "ò", u: "ù", A: "À", E: "È", I: "Ì", O: "Ò", U: "Ù" },
  '"': { a: "ä", e: "ë", i: "ï", o: "ö", u: "ü", A: "Ä", E: "Ë", I: "Ï", O: "Ö", U: "Ü" },
  "^": { a: "â", e: "ê", i: "î", o: "ô", u: "û", A: "Â", E: "Ê", I: "Î", O: "Ô", U: "Û" },
  "~": { n: "ñ", N: "Ñ", a: "ã", o: "õ", A: "Ã", O: "Õ" },
  c: { c: "ç", C: "Ç" },
  v: { s: "š", S: "Š", c: "č", C: "Č", z: "ž", Z: "Ž", r: "ř", R: "Ř", e: "ě", n: "ň" },
};

/** What commands without an argument print, when it is worth keeping in plain text. */
const SYMBOLS: Readonly<Record<string, string>> = {
  TeX: "TeX",
  LaTeX: "LaTeX",
  LaTeXe: "LaTeX2ε",
  BibTeX: "BibTeX",
  XeTeX: "XeTeX",
  LuaTeX: "LuaTeX",
  ldots: "…",
  dots: "…",
  textemdash: "—",
  textendash: "–",
  S: "§",
  copyright: "©",
  euro: "€",
  ss: "ß",
  o: "ø",
  O: "Ø",
  aa: "å",
  AA: "Å",
  ae: "æ",
  AE: "Æ",
  oe: "œ",
  OE: "Œ",
  l: "ł",
  L: "Ł",
};

/**
 * A field's value as plain text, for showing it: accents and symbols resolved, logos
 * such as \TeX spelt out, other commands and braces gone.
 */
export function plainText(value: string): string {
  return (
    value
      .replace(
        /\\([`'"^~])\s*\{?\\?([A-Za-z])\}?/g,
        (_match, accent: string, letter: string) => ACCENTS[accent]?.[letter] ?? letter,
      )
      .replace(
        /\\([cv])\s*\{\\?([A-Za-z])\}/g,
        (_match, accent: string, letter: string) => ACCENTS[accent]?.[letter] ?? letter,
      )
      .replace(/\\([&%$#_])/g, "$1")
      .replace(/---/g, "—")
      .replace(/--/g, "–")
      // As in LaTeX, a command takes the spaces after its name, but not "\ ".
      .replace(/\\([A-Za-z]+)\s*/g, (_match, name: string) => SYMBOLS[name] ?? "")
      .replace(/\\ /g, " ")
      .replace(/[{}]/g, "")
      .replace(/~/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

/** The family names of an author field: "Pérez, Ana and Juan Gómez" → Pérez, Gómez. */
export function familyNames(authors: string): string[] {
  const names: string[] = [];
  let depth = 0;
  let current = "";
  const words = authors.split(/(\s+)/);
  for (const word of words) {
    for (const char of word) depth += char === "{" ? 1 : char === "}" ? -1 : 0;
    if (depth === 0 && /^and$/i.test(word.trim()) && current.trim()) {
      names.push(current.trim());
      current = "";
    } else current += word;
  }
  if (current.trim()) names.push(current.trim());
  return names.map((name) => {
    if (/^\{.*\}$/.test(name)) return plainText(name);
    const comma = name.indexOf(",");
    if (comma !== -1) return plainText(name.slice(0, comma));
    const parts = name.split(/\s+/);
    return plainText(parts[parts.length - 1] ?? name);
  });
}

/** "Pérez", "Pérez y Gómez", "Pérez et al.": how a list of references names authors. */
export function authorsLabel(entry: BibEntry): string {
  const source = entry.fields.author ?? entry.fields.editor;
  if (!source) return "";
  const families = familyNames(source);
  if (families.length === 1) return families[0]!;
  if (families.length === 2) return `${families[0]} y ${families[1]}`;
  return `${families[0]} et al.`;
}

/** The year an entry was published, from `year` or a biblatex `date`. */
export function entryYear(entry: BibEntry): string {
  const { year, date } = entry.fields;
  if (year) return plainText(year);
  return /^\d{4}/.exec(date ?? "")?.[0] ?? "";
}
