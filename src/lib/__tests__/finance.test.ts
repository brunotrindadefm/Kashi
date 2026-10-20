import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyTransaction,
  extractMerchantKey,
  normalizeText,
} from '../classifier.ts';
import { DEFAULT_CATEGORIES } from '../constants.ts';
import { formatCurrency, getTodayIsoDate } from '../formatters.ts';
import {
  parseBankStatementFile,
  parseCsvStatement,
  parseOfxStatement,
} from '../statementParser.ts';
import { parseBankNotification } from '../notificationParser.ts';
import type { Category, ClassificationRule } from '../../types/finance.ts';

describe('Kashi Smart Classification Engine (classifier.ts)', () => {
  it('normalizes accents, uppercase letters, and extra spaces', () => {
    assert.equal(
      normalizeText('  PIX Enviado - São Paulo Pão & Café! '),
      'pix enviado sao paulo pao cafe'
    );
  });

  it('extracts clean merchant keys from bank and PIX descriptions', () => {
    assert.equal(
      extractMerchantKey('PIX Enviado - Padaria Pao Dourado'),
      'padaria pao dourado'
    );
    assert.equal(
      extractMerchantKey('Compra Cartao Uber *Trip Centro 12/05'),
      'uber *trip centro'
    );
  });

  it('classifies iFood, Uber, Netflix, Health, Housing and Salary accurately', () => {
    const ifoodMatch = classifyTransaction(
      'iFood *Burger King Delivery',
      'expense',
      DEFAULT_CATEGORIES
    );
    assert.equal(ifoodMatch.categoryName, 'Comida');
    assert.equal(ifoodMatch.reason, 'keyword');

    const uberMatch = classifyTransaction(
      'Uber *Trip Sao Paulo',
      'expense',
      DEFAULT_CATEGORIES
    );
    assert.equal(uberMatch.categoryName, 'Transporte');

    const netflixMatch = classifyTransaction(
      'Netflix.com Assinatura Mensal',
      'expense',
      DEFAULT_CATEGORIES
    );
    assert.equal(netflixMatch.categoryName, 'Assinaturas');

    const pharmacyMatch = classifyTransaction(
      'Droga Raia Farmacia',
      'expense',
      DEFAULT_CATEGORIES
    );
    assert.equal(pharmacyMatch.categoryName, 'Saúde');

    const housingMatch = classifyTransaction(
      'Condomínio Residencial Jardins',
      'expense',
      DEFAULT_CATEGORIES
    );
    assert.equal(housingMatch.categoryName, 'Moradia');

    const salaryMatch = classifyTransaction(
      'Salário Mensal Empresa Tech',
      'income',
      DEFAULT_CATEGORIES
    );
    assert.equal(salaryMatch.categoryName, 'Salário');
  });

  it('prioritizes learned user merchant/PIX memory rules over default rules', () => {
    const leisureCategory = DEFAULT_CATEGORIES.find((c) => c.name === 'Lazer')!;
    const learnedRules: ClassificationRule[] = [
      {
        id: 'rule-1',
        keyword: 'joao barbearia',
        categoryId: leisureCategory.id,
        hitCount: 3,
        updatedAt: new Date().toISOString(),
      },
    ];

    const match = classifyTransaction(
      'PIX Enviado - Joao Barbearia Centro',
      'expense',
      DEFAULT_CATEGORIES,
      learnedRules
    );

    assert.equal(match.categoryId, leisureCategory.id);
    assert.equal(match.categoryName, 'Lazer');
    assert.equal(match.reason, 'memory');
    assert.ok(match.confidence >= 0.95);
  });

  it('matches custom categories created by the user dynamically', () => {
    const customCategories: Category[] = [
      ...DEFAULT_CATEGORIES,
      {
        id: 'cat-petshop',
        name: 'Petshop',
        type: 'expense',
        color: '#10b981',
        icon: 'Tag',
      },
    ];

    const match = classifyTransaction(
      'Banho e Tosa Petshop Amigo Fiel',
      'expense',
      customCategories
    );

    assert.equal(match.categoryId, 'cat-petshop');
    assert.equal(match.categoryName, 'Petshop');
  });

  it('falls back gracefully when description has no known keywords', () => {
    const match = classifyTransaction(
      'Estabelecimento XYZ 98765',
      'expense',
      DEFAULT_CATEGORIES
    );
    assert.equal(match.reason, 'fallback');
    assert.ok(match.categoryId.length > 0);
  });
});

describe('Kashi Statement Parser (statementParser.ts — CSV & OFX)', () => {
  it('parses standard comma-separated CSV statements and detects upcoming dates', () => {
    const pastDate = getTodayIsoDate(-2);
    const futureDate = getTodayIsoDate(7);
    const csv = `Data,Valor,Descrição
${pastDate},-64.90,iFood *Restaurante
${pastDate},4500.00,Salário Mensal
${futureDate},-129.90,Internet Vivo Fibra Agendado`;

    const parsed = parseCsvStatement(csv);
    assert.equal(parsed.length, 3);

    assert.equal(parsed[0].description, 'iFood *Restaurante');
    assert.equal(parsed[0].amount, 64.9);
    assert.equal(parsed[0].type, 'expense');
    assert.equal(parsed[0].status, 'completed');

    assert.equal(parsed[1].description, 'Salário Mensal');
    assert.equal(parsed[1].amount, 4500);
    assert.equal(parsed[1].type, 'income');
    assert.equal(parsed[1].status, 'completed');

    assert.equal(parsed[2].status, 'upcoming');
  });

  it('parses Brazilian semicolon-separated CSV with BRL number formatting (1.234,56) and DD/MM/YYYY', () => {
    const csv = `Data;Histórico;Valor
15/03/2026;Aluguel Mensal;-2.150,75
16/03/2026;PIX Recebido Consultoria;1.800,00`;

    const parsed = parseCsvStatement(csv);
    assert.equal(parsed.length, 2);
    assert.equal(parsed[0].date, '2026-03-15');
    assert.equal(parsed[0].amount, 2150.75);
    assert.equal(parsed[0].type, 'expense');

    assert.equal(parsed[1].date, '2026-03-16');
    assert.equal(parsed[1].amount, 1800);
    assert.equal(parsed[1].type, 'income');
  });

  it('parses OFX bank statement blocks accurately', () => {
    const ofx = `
<OFX>
  <BANKMSGSRSV1>
    <STMTTRN>
      <TRNTYPE>DEBIT
      <DTPOSTED>20260310120000[-3:BRT]
      <TRNAMT>-38.50
      <MEMO>Uber *Trip Aeroporto
    </STMTTRN>
    <STMTTRN>
      <TRNTYPE>CREDIT
      <DTPOSTED>20260312120000[-3:BRT]
      <TRNAMT>6800.00
      <NAME>Salario Mensal
    </STMTTRN>
  </BANKMSGSRSV1>
</OFX>`;

    const parsed = parseOfxStatement(ofx);
    assert.equal(parsed.length, 2);
    assert.equal(parsed[0].description, 'Uber *Trip Aeroporto');
    assert.equal(parsed[0].amount, 38.5);
    assert.equal(parsed[0].type, 'expense');
    assert.equal(parsed[0].date, '2026-03-10');

    assert.equal(parsed[1].description, 'Salario Mensal');
    assert.equal(parsed[1].amount, 6800);
    assert.equal(parsed[1].type, 'income');
  });

  it('routes .ofx and .csv files via parseBankStatementFile', () => {
    const csvItems = parseBankStatementFile(
      'nubank.csv',
      'Data,Valor,Descrição\n2026-03-01,-25.00,Padaria'
    );
    assert.equal(csvItems.length, 1);

    const ofxItems = parseBankStatementFile(
      'itau.ofx',
      '<STMTTRN><TRNAMT>-59.90\n<DTPOSTED>20260302\n<MEMO>Netflix</STMTTRN>'
    );
    assert.equal(ofxItems.length, 1);
    assert.equal(ofxItems[0].description, 'Netflix');
  });
});

describe('Kashi Real-Time Bank Notification Parser (notificationParser.ts)', () => {
  it('parses Nubank credit card purchase notification', () => {
    const parsed = parseBankNotification(
      'Compra de R$ 64,90 APROVADA em IFOOD *RESTAURANTE para o cartão com final 4321.',
      'Nubank'
    );
    assert.ok(parsed);
    assert.equal(parsed.amount, 64.9);
    assert.equal(parsed.type, 'expense');
    assert.equal(parsed.institutionId, 'nubank');
    assert.equal(parsed.description, 'IFOOD *RESTAURANTE');
  });

  it('parses outgoing PIX notification', () => {
    const parsed = parseBankNotification(
      'Transferência de R$ 35,00 enviada via Pix para Padaria Pao Dourado.',
      'Itaú'
    );
    assert.ok(parsed);
    assert.equal(parsed.amount, 35);
    assert.equal(parsed.type, 'expense');
    assert.equal(parsed.institutionId, 'itau');
    assert.equal(parsed.description, 'PIX Enviado - Padaria Pao Dourado');
  });

  it('parses incoming PIX notification as income', () => {
    const parsed = parseBankNotification(
      'Você recebeu uma transferência de R$ 1.450,00 de Empresa Tech via Pix.',
      'Banco Inter'
    );
    assert.ok(parsed);
    assert.equal(parsed.amount, 1450);
    assert.equal(parsed.type, 'income');
    assert.equal(parsed.institutionId, 'inter');
    assert.equal(parsed.description, 'PIX Recebido - Empresa Tech');
  });
});

describe('Kashi Formatters (formatters.ts)', () => {
  it('formats BRL currency values properly', () => {
    const formatted = formatCurrency(1234.56);
    assert.ok(formatted.includes('1.234,56'));
    assert.ok(formatted.includes('R$'));
  });
});
