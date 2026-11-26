import type React from 'react';

type Token =
  | { type: 'num'; val: number }
  | { type: 'ident'; val: string }
  | { type: 'op'; val: string }
  | { type: 'paren'; val: '(' | ')' };

const CONSTANTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
};

const FUNCTIONS: Record<string, (x: number) => number> = {
  sqrt: Math.sqrt,
  abs: Math.abs,
  round: Math.round,
  floor: Math.floor,
  ceil: Math.ceil,
  log: Math.log10,
  ln: Math.log,
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  sind: (x) => Math.sin((x * Math.PI) / 180),
  cosd: (x) => Math.cos((x * Math.PI) / 180),
  tand: (x) => Math.tan((x * Math.PI) / 180),
};

function tokenize(raw: string): Token[] | null {
  const tokens: Token[] = [];
  let i = 0;
  while (i < raw.length) {
    const ch = raw[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let numStr = '';
      while (i < raw.length && /[0-9.]/.test(raw[i])) {
        numStr += raw[i++];
      }
      const val = Number(numStr);
      if (!Number.isFinite(val)) return null;
      tokens.push({ type: 'num', val });
      continue;
    }
    if (/[a-zA-Z]/.test(ch)) {
      let ident = '';
      while (i < raw.length && /[a-zA-Z]/.test(raw[i])) {
        ident += raw[i++];
      }
      tokens.push({ type: 'ident', val: ident.toLowerCase() });
      continue;
    }
    if ('+-*/^%'.includes(ch)) {
      tokens.push({ type: 'op', val: ch });
      i++;
      continue;
    }
    if (ch === '(' || ch === ')') {
      tokens.push({ type: 'paren', val: ch });
      i++;
      continue;
    }
    return null;
  }
  return tokens;
}

export function evaluateMathExpr(rawInput: string): string | null {
  let expr = rawInput
    .trim()
    .replace(/×/g, '*')
    .replace(/÷/g, '/')
    .replace(/−/g, '-');

  // Support "20% of 500"
  expr = expr.replace(/(\d+(?:\.\d+)?)\s*%\s*of\s+/gi, '($1 / 100) * ');

  if (!expr) return null;

  // Require at least one operator or known math function so plain numbers/words don't trigger
  const hasMathSignal =
    /[+\-*/^%]/.test(expr.replace(/^\s*-/, '')) ||
    /\b(sqrt|abs|round|floor|ceil|log|ln|sin|cos|tan|sind|cosd|tand)\s*\(/i.test(expr);
  if (!hasMathSignal) return null;

  const tokens = tokenize(expr);
  if (!tokens || tokens.length === 0) return null;

  let pos = 0;
  const peek = () => tokens[pos];
  const consume = () => tokens[pos++];

  function parseExpr(): number {
    let left = parseTerm();
    while (peek()?.type === 'op' && (peek()?.val === '+' || peek()?.val === '-')) {
      const op = consume().val;
      const right = parseTerm();
      left = op === '+' ? left + right : left - right;
    }
    return left;
  }

  function parseTerm(): number {
    let left = parsePower();
    while (
      peek()?.type === 'op' &&
      (peek()?.val === '*' || peek()?.val === '/' || peek()?.val === '%')
    ) {
      const op = consume().val;
      const right = parsePower();
      if (op === '*') left *= right;
      else if (op === '/') left /= right;
      else left %= right;
    }
    return left;
  }

  function parsePower(): number {
    const base = parseUnary();
    if (peek()?.type === 'op' && peek()?.val === '^') {
      consume();
      return Math.pow(base, parsePower());
    }
    return base;
  }

  function parseUnary(): number {
    if (peek()?.type === 'op' && (peek()?.val === '+' || peek()?.val === '-')) {
      const op = consume().val;
      const val = parseUnary();
      return op === '-' ? -val : val;
    }
    return parsePrimary();
  }

  function parsePrimary(): number {
    const tok = peek();
    if (!tok) throw new Error('Unexpected end');
    if (tok.type === 'num') {
      consume();
      return tok.val;
    }
    if (tok.type === 'paren' && tok.val === '(') {
      consume();
      const val = parseExpr();
      const close = consume();
      if (!close || close.type !== 'paren' || close.val !== ')') {
        throw new Error('Missing )');
      }
      return val;
    }
    if (tok.type === 'ident') {
      consume();
      if (tok.val in CONSTANTS) return CONSTANTS[tok.val];
      if (tok.val in FUNCTIONS) {
        const open = consume();
        if (!open || open.type !== 'paren' || open.val !== '(') {
          throw new Error('Expected (');
        }
        const arg = parseExpr();
        const close = consume();
        if (!close || close.type !== 'paren' || close.val !== ')') {
          throw new Error('Expected )');
        }
        return FUNCTIONS[tok.val](arg);
      }
      throw new Error('Unknown identifier');
    }
    throw new Error('Invalid token');
  }

  try {
    const result = parseExpr();
    if (pos !== tokens.length || !Number.isFinite(result)) return null;
    const rounded = Number(result.toFixed(8));
    return String(rounded);
  } catch {
    return null;
  }
}

const AUTO_MATH_KEY = 'iqra_auto_math_v1';

export function isAutoMathEnabled(): boolean {
  try {
    return localStorage.getItem(AUTO_MATH_KEY) !== 'false';
  } catch {
    return true;
  }
}

export function setAutoMathEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(AUTO_MATH_KEY, String(enabled));
  } catch {
    // ignore
  }
}

/**
 * Call inside contentEditable onKeyDown. When the user presses '=', evaluates
 * the math expression immediately before the caret and inserts `= <result>`.
 */
export function handleInlineMathKeyDown(
  e: React.KeyboardEvent<HTMLDivElement>,
  onUpdated?: (html: string) => void
): boolean {
  if (!isAutoMathEnabled()) return false;
  if (e.key !== '=' || e.ctrlKey || e.metaKey || e.altKey) return false;
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || !sel.isCollapsed) return false;

  const range = sel.getRangeAt(0);
  const node = range.startContainer;
  if (node.nodeType !== Node.TEXT_NODE) return false;

  const textBefore = (node.textContent ?? '').slice(0, range.startOffset);
  // Extract candidate math expression from the end of the line (after any label/colon/newline)
  const candidateMatch = textBefore.match(/(?:^|[:;\n,])\s*([^:;\n,=]+)$/);
  const candidate = (candidateMatch ? candidateMatch[1] : textBefore).trim();
  if (!candidate) return false;

  const result = evaluateMathExpr(candidate);
  if (result === null) return false;

  e.preventDefault();
  const suffix = textBefore.endsWith(' ') ? `= ${result}` : ` = ${result}`;
  document.execCommand('insertText', false, suffix);
  if (onUpdated) {
    onUpdated(e.currentTarget.innerHTML);
  }
  return true;
}
