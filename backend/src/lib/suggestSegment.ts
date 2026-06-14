import type { SegmentRule } from "./segments";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_TIMEOUT_MS = 1200;

const VALID_FIELDS = new Set([
  "totalSpend",
  "orderCount",
  "daysSinceLastPurchase",
  "daysSinceCreation",
  "city",
]);

const VALID_OPERATORS = new Set([">=", "<=", ">", "<", "==", "!="]);

const CITIES = [
  "Mumbai",
  "Delhi",
  "Bangalore",
  "Hyderabad",
  "Pune",
  "Chennai",
  "Kolkata",
  "Ahmedabad",
  "Jaipur",
  "Lucknow",
];

export interface SegmentSuggestResult {
  name: string;
  ruleLogic: "AND" | "OR";
  rules: SegmentRule[];
  reason: string;
  confidence: number;
}

function makeId(index: number): string {
  return `rule-${index}-${Date.now()}`;
}

function sanitizeRules(raw: unknown[]): SegmentRule[] {
  const rules: SegmentRule[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i] as Record<string, unknown>;
    const field = String(item.field ?? "");
    const operator = String(item.operator ?? "");
    if (!VALID_FIELDS.has(field) || !VALID_OPERATORS.has(operator)) continue;

    let value: string | number = item.value as string | number;
    if (field === "city") {
      value = String(value);
    } else {
      value = Number(value);
      if (Number.isNaN(value)) continue;
    }

    rules.push({
      id: makeId(i),
      field,
      operator,
      value,
    });
  }
  return rules;
}

function heuristicSuggestAudience(intent: string): SegmentSuggestResult | null {
  const lower = intent.toLowerCase().trim();
  if (lower.length < 3) return null;

  const rules: SegmentRule[] = [];
  let idx = 0;

  if (
    lower.includes("inactive") ||
    lower.includes("win back") ||
    lower.includes("winback") ||
    lower.includes("90 day") ||
    lower.includes("lapsed")
  ) {
    rules.push({
      id: makeId(idx++),
      field: "daysSinceLastPurchase",
      operator: ">=",
      value: 90,
    });
  }

  if (lower.includes("new customer") || lower.includes("first time") || lower.includes("recent signup")) {
    rules.push({
      id: makeId(idx++),
      field: "daysSinceCreation",
      operator: "<=",
      value: 30,
    });
  }

  if (
    lower.includes("vip") ||
    lower.includes("premium") ||
    lower.includes("high value") ||
    lower.includes("high spender") ||
    lower.includes("big spender")
  ) {
    rules.push({
      id: makeId(idx++),
      field: "totalSpend",
      operator: ">=",
      value: 15000,
    });
  } else if (lower.includes("spender") || lower.includes("spent") || lower.includes("loyal")) {
    rules.push({
      id: makeId(idx++),
      field: "totalSpend",
      operator: ">=",
      value: 5000,
    });
  }

  if (lower.includes("frequent") || lower.includes("repeat")) {
    rules.push({
      id: makeId(idx++),
      field: "orderCount",
      operator: ">=",
      value: 5,
    });
  }

  if (lower.includes("budget") || lower.includes("low spend")) {
    rules.push({
      id: makeId(idx++),
      field: "totalSpend",
      operator: "<=",
      value: 2000,
    });
  }

  for (const city of CITIES) {
    if (lower.includes(city.toLowerCase())) {
      rules.push({
        id: makeId(idx++),
        field: "city",
        operator: "==",
        value: city,
      });
      break;
    }
  }

  if (!rules.length) return null;

  const nameParts: string[] = [];
  if (rules.some((r) => r.field === "daysSinceLastPurchase")) nameParts.push("Win-Back");
  if (rules.some((r) => r.field === "city")) {
    const cityRule = rules.find((r) => r.field === "city");
    if (cityRule) nameParts.push(String(cityRule.value));
  }
  if (rules.some((r) => r.field === "totalSpend" && Number(r.value) >= 15000)) {
    nameParts.push("VIP");
  } else if (rules.some((r) => r.field === "totalSpend")) {
    nameParts.push("High Value");
  }
  if (rules.some((r) => r.field === "orderCount")) nameParts.push("Frequent Buyers");

  const name = nameParts.length ? nameParts.join(" ") : "Custom Audience";

  return {
    name,
    ruleLogic: "AND",
    rules,
    reason: "Matched common audience patterns from your description",
    confidence: 0.78,
  };
}

async function callGroqSuggestSegment(intent: string): Promise<SegmentSuggestResult | null> {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey || apiKey === "your_groq_key_here") return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), GROQ_TIMEOUT_MS);

  try {
    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `You build shopper audience segments for an Indian D2C CRM.
Return JSON only:
{"name":"segment name","ruleLogic":"AND"|"OR","rules":[{"field":"...","operator":"...","value":...}],"reason":"brief","confidence":0.0-1.0}

Allowed fields: totalSpend, orderCount, daysSinceLastPurchase, daysSinceCreation, city
Allowed operators: >=, <=, >, <, ==, !=
city value must be a string (e.g. Mumbai). Numeric fields use numbers.
Use 1-4 rules. Prefer AND unless user asks for OR.`,
          },
          { role: "user", content: intent },
        ],
        max_tokens: 320,
        temperature: 0.3,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) return null;

    const data = (await response.json()) as {
      choices: { message: { content: string } }[];
    };
    const text = data.choices[0]?.message?.content;
    if (!text) return null;

    const parsed = JSON.parse(text) as {
      name?: string;
      ruleLogic?: string;
      rules?: unknown[];
      reason?: string;
      confidence?: number;
    };

    const rules = sanitizeRules(parsed.rules ?? []);
    if (!rules.length) return null;

    return {
      name: String(parsed.name ?? "Suggested Audience").slice(0, 60),
      ruleLogic: parsed.ruleLogic === "OR" ? "OR" : "AND",
      rules,
      reason: String(parsed.reason ?? "AI-generated audience rules"),
      confidence: Math.min(1, Math.max(0, Number(parsed.confidence) || 0.85)),
    };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function suggestAudience(intent: string): Promise<SegmentSuggestResult> {
  const trimmed = intent.trim();
  if (trimmed.length < 3) {
    return {
      name: "",
      ruleLogic: "AND",
      rules: [],
      reason: "Describe your audience in a few words",
      confidence: 0,
    };
  }

  const groq = await callGroqSuggestSegment(trimmed);
  if (groq) return groq;

  const heuristic = heuristicSuggestAudience(trimmed);
  if (heuristic) return heuristic;

  return {
    name: "Custom Segment",
    ruleLogic: "AND",
    rules: [
      { id: makeId(0), field: "totalSpend", operator: ">=", value: 1000 },
    ],
    reason: "Default rule — refine or add conditions for your audience",
    confidence: 0.5,
  };
}
