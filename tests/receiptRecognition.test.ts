import { parseLocalizedMoney } from '../src/services/receiptRecognition/MoneyParser';
import { resolveAmount } from '../src/services/receiptRecognition/AmountResolver';
import { resolveCategory } from '../src/services/receiptRecognition/CategoryResolver';
import { resolveDate } from '../src/services/receiptRecognition/DateResolver';

function assertEqual(actual: any, expected: any, testName: string) {
  if (actual === expected) {
    console.log(`[PASS] ${testName}`);
  } else {
    console.error(`[FAIL] ${testName}: expected ${expected}, got ${actual}`);
    process.exitCode = 1;
  }
}

console.log('=== RUNNING RECEIPT RECOGNITION TEST SUITE ===\n');

// --- MONEY PARSER TESTS ---
assertEqual(parseLocalizedMoney('88.000'), 88000, 'MoneyParser: 88.000');
assertEqual(parseLocalizedMoney('1.250.000'), 1250000, 'MoneyParser: 1.250.000');
assertEqual(parseLocalizedMoney('1,234,567'), 1234567, 'MoneyParser: 1,234,567');
assertEqual(parseLocalizedMoney('88k'), 88000, 'MoneyParser: 88k');
assertEqual(parseLocalizedMoney('88.000đ'), 88000, 'MoneyParser: 88.000đ');

// --- TEST CASE A: Subtotal 100k, Total 100k -> 100k ---
const resA = resolveAmount({
  financials: { subtotal: 100000, grandTotal: 100000 },
});
assertEqual(resA.amount, 100000, 'Test A: Subtotal 100k, Total 100k');

// --- TEST CASE B: Subtotal 100k, Discount 20k, Total 80k -> 80k ---
const resB = resolveAmount({
  financials: { subtotal: 100000, discount: 20000, grandTotal: 80000 },
});
assertEqual(resB.amount, 80000, 'Test B: Subtotal 100k, Discount 20k, Total 80k');

// --- TEST CASE C: Subtotal 100k, VAT 8k, Total 108k -> 108k ---
const resC = resolveAmount({
  financials: { subtotal: 100000, tax: 8000, grandTotal: 108000 },
});
assertEqual(resC.amount, 108000, 'Test C: Subtotal 100k, VAT 8k, Total 108k');

// --- TEST CASE D: Total 88k, Cash 100k, Change 12k -> 88k ---
const resD = resolveAmount({
  financials: { grandTotal: 88000, cashReceived: 100000, change: 12000 },
});
assertEqual(resD.amount, 88000, 'Test D: Total 88k, Cash 100k, Change 12k');

// --- TEST CASE E: Multiple item prices + Total -> total ---
const resE = resolveAmount({
  financials: { grandTotal: 150000 },
  items: [
    { name: 'Món 1', totalPrice: 50000 },
    { name: 'Món 2', totalPrice: 100000 },
  ],
});
assertEqual(resE.amount, 150000, 'Test E: Multiple item prices + Total');

// --- TEST CASE F: Vietnamese receipt labeled candidate "TỔNG CỘNG" ---
const resF = resolveAmount({
  rawCandidates: [
    { label: 'THÀNH TIỀN', value: 100000 },
    { label: 'VAT 8%', value: 8000 },
    { label: 'TỔNG CỘNG', value: 108000 },
    { label: 'TIỀN KHÁCH ĐƯA', value: 200000 },
  ],
});
assertEqual(resF.amount, 108000, 'Test F: Vietnamese receipt candidates');

// --- CATEGORY TEST CASES G through N ---

// G. Phúc Long -> Ăn uống
const catG = resolveCategory({ merchant: 'Phúc Long' });
assertEqual(catG.category, 'Ăn uống', 'Test G: Phúc Long -> Ăn uống');

// H. CGV -> Giải trí
const catH = resolveCategory({ merchant: 'CGV Cinema' });
assertEqual(catH.category, 'Giải trí', 'Test H: CGV -> Giải trí');

// I. Grab -> Di chuyển
const catI = resolveCategory({ merchant: 'Grab' });
assertEqual(catI.category, 'Di chuyển', 'Test I: Grab -> Di chuyển');

// J. Nhà thuốc -> Sức khỏe
const catJ = resolveCategory({ merchant: 'Nhà thuốc Long Châu' });
assertEqual(catJ.category, 'Sức khỏe', 'Test J: Nhà thuốc -> Sức khỏe');

// K. Shopee + quần áo -> Mua sắm
const catK = resolveCategory({ merchant: 'Shopee', items: [{ name: 'Áo thun nam' }] });
assertEqual(catK.category, 'Mua sắm', 'Test K: Shopee + quần áo -> Mua sắm');

// L. Shopee + thuốc -> Sức khỏe
const catL = resolveCategory({ merchant: 'Shopee', items: [{ name: 'Thuốc ho Panadol' }] });
assertEqual(catL.category, 'Sức khỏe', 'Test L: Shopee + thuốc -> Sức khỏe');

// M. WinMart + groceries -> Ăn uống
const catM = resolveCategory({ merchant: 'WinMart', items: [{ name: 'Sữa tươi, Thịt heo' }] });
assertEqual(catM.category, 'Ăn uống', 'Test M: WinMart + groceries -> Ăn uống');

// N. WinMart + cleaning products -> Nhà cửa
const catN = resolveCategory({ merchant: 'WinMart', items: [{ name: 'Nước lau sàn Sunlight' }] });
assertEqual(catN.category, 'Nhà cửa', 'Test N: WinMart + cleaning products -> Nhà cửa');

// DATE TESTS
assertEqual(resolveDate('02/09/2026'), '2026-09-02', 'DateResolver: 02/09/2026');
assertEqual(resolveDate('2026-09-02'), '2026-09-02', 'DateResolver: 2026-09-02');
assertEqual(resolveDate('02/09'), '2026-09-02', 'DateResolver: 02/09 -> 2026-09-02');

console.log('\n=== ALL TEST CASES COMPLETED ===');
