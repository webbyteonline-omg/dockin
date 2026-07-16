import type { ExpenseCategory } from "./supabase/types";

export interface ParsedSMS {
  amount: number;
  merchant: string | null;
  category: ExpenseCategory;
  raw: string;
}

const CATEGORY_KEYWORDS: Record<Exclude<ExpenseCategory, "others">, string[]> = {
  food: ["swiggy", "zomato", "restaurant", "cafe", "dhaba", "food", "pizza", "burger", "dominos", "mcdonalds", "kfc"],
  travel: ["ola", "uber", "rapido", "bus", "metro", "petrol", "diesel", "irctc", "train", "flight"],
  shopping: ["amazon", "flipkart", "myntra", "meesho", "ajio", "mall", "store"],
  bills: ["electricity", "gas", "water", "broadband", "wifi", "jio", "airtel", "vi ", "bsnl", "recharge"],
  education: ["book", "course", "udemy", "coursera", "xerox", "photocopy", "stationery"],
  health: ["pharmacy", "medicine", "doctor", "hospital", "apollo", "medplus"],
  entertainment: ["netflix", "spotify", "prime", "hotstar", "movie", "pvr", "inox", "game"],
};

/** Guess a category from merchant name / SMS text. */
export function categorize(text: string): ExpenseCategory {
  const lower = ` ${text.toLowerCase()} `;
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) {
      return category as ExpenseCategory;
    }
  }
  return "others";
}

interface Pattern {
  name: string;
  regex: RegExp;
  amountIndex: number;
  merchantIndex?: number;
}

// Ordered: most specific first. Amounts may contain Indian grouping (1,299.00).
const AMOUNT = String.raw`([\d,]+(?:\.\d{1,2})?)`;

const PATTERNS: Pattern[] = [
  {
    name: "GPay",
    regex: new RegExp(String.raw`(?:Rs\.?|INR|₹)\s*${AMOUNT}\s+(?:sent to|paid to)\s+([^\n.]+)`, "i"),
    amountIndex: 1,
    merchantIndex: 2,
  },
  {
    name: "UPI-to",
    regex: new RegExp(
      String.raw`(?:Rs\.?|INR|₹)\s*${AMOUNT}\s+(?:debited|transferred).*?(?:to|towards)\s+(?:VPA\s+)?([\w.@-]+(?:\s+[\w&'-]+){0,4})`,
      "i"
    ),
    amountIndex: 1,
    merchantIndex: 2,
  },
  {
    name: "PhonePe",
    regex: new RegExp(String.raw`(?:Rs\.?|INR|₹)\s*${AMOUNT}\s+(?:debited|transferred)`, "i"),
    amountIndex: 1,
  },
  {
    name: "Paytm",
    regex: new RegExp(String.raw`(?:Rs\.?|INR|₹)\s*${AMOUNT}\s+paid`, "i"),
    amountIndex: 1,
  },
  {
    name: "Bank debit",
    regex: new RegExp(String.raw`(?:debited|spent)(?:\s+(?:by|with|for))?\s+(?:Rs\.?|INR|₹)?\s*${AMOUNT}`, "i"),
    amountIndex: 1,
  },
  {
    name: "Generic amount",
    regex: new RegExp(String.raw`(?:Rs\.?|INR|₹)\s*${AMOUNT}`, "i"),
    amountIndex: 1,
  },
];

const MERCHANT_HINTS: RegExp[] = [
  /(?:at|to|towards)\s+([A-Z][\w&' .-]{2,30}?)(?:\s+on|\s+via|\s+using|\.|,|$)/,
  /(?:VPA|UPI)\s+([\w.-]+@[\w]+)/i,
];

function cleanMerchant(m: string): string | null {
  const cleaned = m
    .replace(/\s+/g, " ")
    .replace(/[.,;:]+$/, "")
    .replace(/\b(?:on|via|using|upi|ref|txn).*$/i, "")
    .trim();
  if (!cleaned || cleaned.length < 2) return null;
  return cleaned.slice(0, 60);
}

/** Parse a UPI/bank SMS into amount + merchant + guessed category. */
export function parseSMS(text: string): ParsedSMS | null {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return null;

  for (const pattern of PATTERNS) {
    const match = normalized.match(pattern.regex);
    if (!match) continue;

    const amountStr = match[pattern.amountIndex];
    if (!amountStr) continue;
    const amount = parseFloat(amountStr.replace(/,/g, ""));
    if (!Number.isFinite(amount) || amount <= 0 || amount > 10_00_000) continue;

    let merchant: string | null = null;
    if (pattern.merchantIndex !== undefined) {
      const raw = match[pattern.merchantIndex];
      if (raw) merchant = cleanMerchant(raw);
    }
    if (!merchant) {
      for (const hint of MERCHANT_HINTS) {
        const m = normalized.match(hint);
        if (m && m[1]) {
          merchant = cleanMerchant(m[1]);
          if (merchant) break;
        }
      }
    }

    return {
      amount,
      merchant,
      category: categorize(`${merchant ?? ""} ${normalized}`),
      raw: normalized,
    };
  }

  return null;
}
