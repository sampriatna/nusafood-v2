import {
  DAILY_REPORT_ISSUE_LANGUAGE_SEEDS,
  resolveDailyReportIssueLanguage,
  type DailyReportIssueLanguage,
  type DailyReportRouteType,
} from "./daily-report-issue-language-seed";

const ROUTE_PRIORITY: Record<DailyReportRouteType, number> = {
  safety: 80,
  maintenance: 70,
  finance: 60,
  cleaning: 50,
  purchasing: 40,
  stock: 30,
  service: 20,
  other: 0,
};

const ROUTE_HINT: Partial<Record<DailyReportRouteType, string>> = {
  safety: "bahaya",
  maintenance: "maintenance",
  finance: "pembayaran",
  cleaning: "kebersihan",
  purchasing: "pengadaan",
  stock: "stok",
  service: "pesanan",
};

function normalized(value: string): string {
  return ` ${value.toLowerCase().replace(/\s+/g, " ")} `;
}

function matchedTerms(text: string, terms: string[]): string[] {
  return terms.filter((term) => text.includes(term.toLowerCase()));
}

/**
 * Tebak kategori dari bahasa staff yang sangat pendek. Dipakai sebagai hint ke
 * classifier lama, bukan menggantikan routing/otorisasi yang sudah berjalan.
 */
export function inferDailyReportIssueRouteType(input: {
  note: string;
  activityTitle: string;
}): DailyReportRouteType | null {
  const text = normalized(`${input.activityTitle} ${input.note}`);
  const ranked = DAILY_REPORT_ISSUE_LANGUAGE_SEEDS.map((seed, index) => {
    const matches = matchedTerms(text, seed.match_terms);
    return {
      routeType: seed.route_type,
      matches,
      index,
      score: matches.length,
      specificity: matches.reduce((sum, term) => sum + term.length, 0),
    };
  })
    .filter((row) => row.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        ROUTE_PRIORITY[b.routeType] - ROUTE_PRIORITY[a.routeType] ||
        b.specificity - a.specificity ||
        a.index - b.index,
    );

  return ranked[0]?.routeType ?? null;
}

export function routeTypeHint(routeType: DailyReportRouteType | null): string | null {
  if (!routeType) return null;
  return ROUTE_HINT[routeType] ?? null;
}

/**
 * Resolver subtype dengan tie-break yang mengutamakan istilah lebih spesifik.
 * Contoh `mesin kopi mati` memilih Mesin Kopi, bukan fallback peralatan umum.
 */
export function resolveDailyReportIssueLanguageSmart(input: {
  routeType: DailyReportRouteType;
  note: string;
  activityTitle: string;
}): DailyReportIssueLanguage {
  const text = normalized(`${input.activityTitle} ${input.note}`);
  const ranked = DAILY_REPORT_ISSUE_LANGUAGE_SEEDS.filter(
    (seed) => seed.route_type === input.routeType,
  )
    .map((seed, index) => {
      const matches = matchedTerms(text, seed.match_terms);
      return {
        seed,
        index,
        score: matches.length,
        specificity: matches.reduce((sum, term) => sum + term.length, 0),
      };
    })
    .filter((row) => row.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.specificity - a.specificity ||
        a.index - b.index,
    );

  const matched = ranked[0]?.seed;
  if (!matched) return resolveDailyReportIssueLanguage(input);

  return {
    seed_id: matched.seed_id,
    subject: matched.subject,
    problem: matched.problem,
    steps: matched.steps,
    standards: matched.standards,
  };
}
