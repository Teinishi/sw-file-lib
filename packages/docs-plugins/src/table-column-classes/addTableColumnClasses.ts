type TagName = "table" | "thead" | "tbody" | "tfoot" | "tr" | "th" | "td";

interface TagMatch {
  raw: string;
  tag: TagName;
  closing: boolean;
  attrs: string;
  start: number;
  end: number;
  nameEnd: number;
}

interface Region {
  start: number;
  end: number;
  content: string;
}

interface Cell {
  tag: "th" | "td";
  attrs: string;
  nameEnd: number;
  contentStart: number;
  contentEnd: number;
}

interface Row {
  cells: Cell[];
  isHeader: boolean;
}

interface Edit {
  at: number;
  insert: string;
}

const TAG_RE = /<(\/)?\s*(table|thead|tbody|tfoot|tr|th|td)((?:\s+[^<>]*)?)\s*(\/)?>/gi;

export function addTableColumnClasses(markdown: string): string {
  const regions = findTableRegions(markdown);
  let result = markdown;

  for (let i = regions.length - 1; i >= 0; i--) {
    const region = regions[i]!;
    const edits = buildClassEdits(region.content);
    const updated = applyEdits(region.content, edits);
    result = result.slice(0, region.start) + updated + result.slice(region.end);
  }

  return result;
}

function findTableRegions(markdown: string): Region[] {
  const regions: Region[] = [];
  let depth = 0;
  let regionStart = -1;

  for (const t of scanTags(markdown)) {
    if (t.tag !== "table") continue;
    if (!t.closing) {
      if (depth === 0) regionStart = t.start;
      depth++;
    } else {
      depth = Math.max(0, depth - 1);
      if (depth === 0 && regionStart !== -1) {
        regions.push({
          start: regionStart,
          end: t.end,
          content: markdown.slice(regionStart, t.end),
        });
        regionStart = -1;
      }
    }
  }
  return regions;
}

function buildClassEdits(tableHtml: string): Edit[] {
  const rows = parseTableRows(tableHtml);
  const headerRow = rows.find((r) => r.isHeader);
  if (!headerRow) return [];

  const columnSlugs = headerRow.cells.map((c) =>
    toKebabCase(extractText(tableHtml.slice(c.contentStart, c.contentEnd))),
  );

  const edits: Edit[] = [];

  const addClassEdit = (cell: Cell, slug: string) => {
    if (!slug) return;
    const className = `column-${slug}`;
    const existingClassMatch = cell.attrs.match(/class\s*=\s*"([^"]*)"/i);

    if (existingClassMatch) {
      const classAttrStart = cell.nameEnd + cell.attrs.indexOf(existingClassMatch[0]);
      const insertAt = classAttrStart + existingClassMatch[0].length - 1;
      edits.push({ at: insertAt, insert: ` ${className}` });
    } else {
      edits.push({ at: cell.nameEnd, insert: ` class="${className}"` });
    }
  };

  for (const row of rows) {
    row.cells.forEach((cell, i) => {
      const slug = columnSlugs[i];
      if (slug !== undefined) addClassEdit(cell, slug);
    });
  }

  return edits;
}

function extractText(s: string): string {
  return s
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function toKebabCase(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase();
}

function applyEdits(text: string, edits: Edit[]): string {
  const sorted = [...edits].sort((a, b) => b.at - a.at);
  let out = text;
  for (const e of sorted) {
    out = out.slice(0, e.at) + e.insert + out.slice(e.at);
  }
  return out;
}

function* scanTags(html: string): Generator<TagMatch> {
  const re = new RegExp(TAG_RE.source, TAG_RE.flags);
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const [raw, closingSlash, name, attrs] = m;
    const nameEnd = m.index + 1 + (closingSlash ? 1 : 0) + name!.length;
    yield {
      raw,
      tag: name!.toLowerCase() as TagName,
      closing: !!closingSlash,
      attrs: attrs ?? "",
      start: m.index,
      end: m.index + raw.length,
      nameEnd,
    };
  }
}

function parseTableRows(tableHtml: string): Row[] {
  const rows: Row[] = [];
  let theadDepth = 0;
  let currentRow: Cell[] | null = null;
  let openCell: { tag: "th" | "td"; attrs: string; nameEnd: number; contentStart: number } | null =
    null;
  let sawAnyRow = false;

  for (const t of scanTags(tableHtml)) {
    switch (t.tag) {
      case "thead":
        theadDepth += t.closing ? -1 : 1;
        break;

      case "tr":
        if (!t.closing) {
          currentRow = [];
        } else if (currentRow) {
          rows.push({
            cells: currentRow,
            // thead 内、または(theadが無い場合の)最初の行をヘッダー扱い
            isHeader: theadDepth > 0 || !sawAnyRow,
          });
          sawAnyRow = true;
          currentRow = null;
        }
        break;

      case "th":
      case "td":
        if (!t.closing) {
          openCell = {
            tag: t.tag,
            attrs: t.attrs,
            nameEnd: t.nameEnd,
            contentStart: t.end,
          };
        } else if (openCell && currentRow) {
          currentRow.push({ ...openCell, contentEnd: t.start });
          openCell = null;
        }
        break;
    }
  }
  return rows;
}
