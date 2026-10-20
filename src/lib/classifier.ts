import type {
  Category,
  ClassificationMatch,
  ClassificationRule,
  TransactionType,
} from '../types/finance';

/**
 * Normalizes text by lowercasing, stripping accents, and trimming extra spaces.
 */
export function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s*]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extracts a clean merchant or PIX identifier from a transaction description
 * so that user confirmations can be remembered for future transactions.
 */
export function extractMerchantKey(description: string): string {
  const normalized = normalizeText(description);
  const cleaned = normalized
    .replace(/^(pix enviado|pix recebido|compra cartao|debito automatico|pagamento|ted|doc)\s*/g, '')
    .replace(/\b(parcela\s*\d+\s*\d*|agendado|\d{2}\/\d{2})\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return normalized;
  // Keep up to the first 3 meaningful tokens as the merchant signature
  const tokens = cleaned.split(' ').filter((token) => token.length >= 2);
  return tokens.slice(0, 3).join(' ') || cleaned;
}

const BUILTIN_KEYWORD_MAP: Record<string, string[]> = {
  Comida: [
    'ifood',
    'rappi',
    'ze delivery',
    'aiqfome',
    'burger',
    'mcdonalds',
    'bk ',
    'restaurante',
    'padaria',
    'pao ',
    'supermercado',
    'mercado',
    'carrefour',
    'pao de acucar',
    'assai',
    'atacadao',
    'lanchonete',
    'cafe',
    'starbucks',
    'sushi',
    'pizza',
    'outback',
    'acougue',
    'hortifruti',
    'comida',
    'almoco',
    'jantar',
    'confeitaria',
    'doceria',
  ],
  Transporte: [
    'uber',
    '99app',
    '99pop',
    '99*',
    'cabify',
    'indrive',
    'posto',
    'shell',
    'ipiranga',
    'petrobras',
    'combustivel',
    'gasolina',
    'etanol',
    'estacionamento',
    'sem parar',
    'veloe',
    'pedagio',
    'metro',
    'bilhete unico',
    'onibus',
    'seguro auto',
    'porto seguro',
    'oficina',
    'ipva',
    'estapar',
  ],
  Moradia: [
    'aluguel',
    'condominio',
    'iptu',
    'energia',
    'conta de luz',
    'enel',
    'cpfl',
    'cemig',
    'light',
    'agua',
    'sabesp',
    'comgas',
    'internet',
    'vivo fibra',
    'claro',
    'oi fibra',
    'tim live',
    'reforma',
    'leroy merlin',
    'fatura nucartao',
  ],
  Assinaturas: [
    'netflix',
    'spotify',
    'amazon prime',
    'prime video',
    'disney',
    'hbo',
    'max',
    'apple',
    'icloud',
    'google one',
    'youtube',
    'chatgpt',
    'openai',
    'claude',
    'adobe',
    'canva',
    'assinatura',
    'xbox',
    'playstation',
    'steam',
    'audible',
  ],
  Saúde: [
    'droga',
    'drogaria',
    'farmacia',
    'raia',
    'drogasil',
    'pacheco',
    'pague menos',
    'panvel',
    'unimed',
    'amil',
    'bradesco saude',
    'sulamerica',
    'plano de saude',
    'consulta',
    'medico',
    'dentista',
    'hospital',
    'laboratorio',
    'exame',
    'psicologo',
    'terapia',
    'academia',
    'smart fit',
    'bluefit',
    'gympass',
    'wellhub',
  ],
  Lazer: [
    'cinema',
    'cinemark',
    'ingresso',
    'show',
    'teatro',
    'bar ',
    'pub',
    'balada',
    'viagem',
    'hotel',
    'airbnb',
    'booking',
    'decolar',
    'latam',
    'azul',
    'gol',
    'parque',
    'festa',
    'shopping',
    'livraria',
  ],
  Salário: [
    'salario',
    'pagamento mensal',
    'folha',
    'holerite',
    'adiantamento salarial',
    '13 salario',
    'pro-labore',
    'prolabore',
    'remuneracao',
  ],
  'Renda Extra': [
    'freelance',
    'freela',
    'pix recebido',
    'dividendo',
    'fii',
    'rendimento',
    'cashback',
    'venda',
    'comissao',
    'bonus',
    'reembolso',
    'consultoria',
  ],
};

/**
 * Predicts the best category for a transaction description using:
 * 1. User's learned merchant/PIX memory rules (highest priority)
 * 2. Direct match on custom category names
 * 3. Built-in FinTech keyword dictionary (iFood, Uber, PIX, Netflix, etc.)
 * 4. Type-appropriate fallback category
 */
export function classifyTransaction(
  description: string,
  type: TransactionType,
  categories: Category[],
  userRules: ClassificationRule[] = []
): ClassificationMatch {
  const normalizedDesc = normalizeText(description);
  const merchantKey = extractMerchantKey(description);

  const compatibleCategories = categories.filter(
    (c) => c.type === type || c.type === 'both'
  );
  const pool = compatibleCategories.length > 0 ? compatibleCategories : categories;

  if (!normalizedDesc) {
    const fallback = pool[0];
    return {
      categoryId: fallback?.id ?? '',
      categoryName: fallback?.name ?? 'Geral',
      confidence: 0.2,
      reason: 'fallback',
    };
  }

  // 1. Check user's learned merchant/PIX memory rules first
  const sortedRules = [...userRules].sort((a, b) => b.hitCount - a.hitCount);
  for (const rule of sortedRules) {
    const normalizedRuleKey = normalizeText(rule.keyword);
    if (
      normalizedRuleKey.length >= 2 &&
      (normalizedDesc.includes(normalizedRuleKey) ||
        merchantKey === normalizedRuleKey)
    ) {
      const matchedCat = categories.find((c) => c.id === rule.categoryId);
      if (matchedCat) {
        return {
          categoryId: matchedCat.id,
          categoryName: matchedCat.name,
          confidence: 0.98,
          reason: 'memory',
          matchedKeyword: rule.keyword,
        };
      }
    }
  }

  // 2. Check built-in keyword rules mapped to user's available categories
  for (const [targetCategoryName, keywords] of Object.entries(BUILTIN_KEYWORD_MAP)) {
    const normalizedTargetName = normalizeText(targetCategoryName);
    const category = categories.find(
      (c) => normalizeText(c.name) === normalizedTargetName
    );
    if (!category) continue;

    for (const kw of keywords) {
      const normalizedKw = normalizeText(kw);
      if (normalizedDesc.includes(normalizedKw)) {
        return {
          categoryId: category.id,
          categoryName: category.name,
          confidence: 0.92,
          reason: 'keyword',
          matchedKeyword: kw.trim(),
        };
      }
    }
  }

  // 3. Check if description directly mentions any custom category name
  for (const category of pool) {
    const normCatName = normalizeText(category.name);
    if (normCatName.length >= 3 && normalizedDesc.includes(normCatName)) {
      return {
        categoryId: category.id,
        categoryName: category.name,
        confidence: 0.85,
        reason: 'keyword',
        matchedKeyword: category.name,
      };
    }
  }

  // 4. Fallback to first compatible category
  const fallback = pool[0] ?? categories[0];
  return {
    categoryId: fallback?.id ?? '',
    categoryName: fallback?.name ?? 'Outros',
    confidence: 0.35,
    reason: 'fallback',
  };
}
