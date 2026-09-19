import * as XLSX from 'xlsx';
import { type Transaction, type UserSettings, type BalancesSummary } from '../types';
import { formatVND, formatDateVN, formatTimeVN } from './formatters';
import { tCategory } from './translations';

export interface ReportFilterOptions {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  accountFilter: 'all' | 'wallet' | 'bank';
  title?: string;
}

export interface ReportSummaryData {
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  transactionCount: number;
  incomeCount: number;
  expenseCount: number;
  categoryBreakdown: {
    category: string;
    amount: number;
    count: number;
    percentage: number;
  }[];
  accountSummary: {
    walletIncome: number;
    walletExpense: number;
    bankIncome: number;
    bankExpense: number;
  };
}

/**
 * Calculates aggregated metrics from filtered transactions
 */
export function calculateReportSummary(
  transactions: Transaction[],
  options: ReportFilterOptions
): ReportSummaryData {
  const filtered = transactions.filter((t) => {
    if (t.date < options.startDate || t.date > options.endDate) return false;
    if (options.accountFilter !== 'all' && t.account !== options.accountFilter) return false;
    return true;
  });

  let totalIncome = 0;
  let totalExpense = 0;
  let incomeCount = 0;
  let expenseCount = 0;
  let walletIncome = 0;
  let walletExpense = 0;
  let bankIncome = 0;
  let bankExpense = 0;

  const categoryMap: Record<string, { amount: number; count: number }> = {};

  for (const t of filtered) {
    if (t.type === 'income') {
      totalIncome += t.amount;
      incomeCount++;
      if (t.account === 'wallet') walletIncome += t.amount;
      else bankIncome += t.amount;
    } else {
      totalExpense += t.amount;
      expenseCount++;
      if (t.account === 'wallet') walletExpense += t.amount;
      else bankExpense += t.amount;

      const catName = t.category || 'Khác';
      if (!categoryMap[catName]) {
        categoryMap[catName] = { amount: 0, count: 0 };
      }
      categoryMap[catName].amount += t.amount;
      categoryMap[catName].count += 1;
    }
  }

  const categoryBreakdown = Object.entries(categoryMap)
    .map(([category, data]) => ({
      category,
      amount: data.amount,
      count: data.count,
      percentage: totalExpense > 0 ? (data.amount / totalExpense) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  return {
    totalIncome,
    totalExpense,
    netSavings: totalIncome - totalExpense,
    transactionCount: filtered.length,
    incomeCount,
    expenseCount,
    categoryBreakdown,
    accountSummary: {
      walletIncome,
      walletExpense,
      bankIncome,
      bankExpense,
    },
  };
}

/**
 * Exports financial report to a styled Excel (.xlsx) file
 */
export async function exportToExcel(
  transactions: Transaction[],
  options: ReportFilterOptions,
  userSettings?: UserSettings | null,
  balances?: BalancesSummary
): Promise<string> {
  const filtered = transactions
    .filter((t) => {
      if (t.date < options.startDate || t.date > options.endDate) return false;
      if (options.accountFilter !== 'all' && t.account !== options.accountFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return (a.createdAt || '').localeCompare(b.createdAt || '');
    });

  const summary = calculateReportSummary(transactions, options);
  const wb = XLSX.utils.book_new();

  // 1. SHEET 1: TỔNG QUAN BÁO CÁO (Overview Sheet)
  const userName = userSettings?.nickname || 'Chủ tài khoản';
  const accountLabel =
    options.accountFilter === 'all'
      ? 'Tất cả tài khoản'
      : options.accountFilter === 'wallet'
      ? 'Ví tiền mặt'
      : 'Tài khoản ngân hàng';

  const overviewRows: (string | number)[][] = [
    ['BÁO CÁO TÀI CHÍNH CÁ NHÂN - FIMA'],
    [''],
    ['Người lập báo cáo:', userName],
    ['Thời gian xuất:', `${new Date().toLocaleDateString('vi-VN')} ${new Date().toLocaleTimeString('vi-VN')}`],
    ['Kỳ thống kê:', `Từ ${formatDateVN(options.startDate)} đến ${formatDateVN(options.endDate)}`],
    ['Phạm vi tài khoản:', accountLabel],
    [''],
    ['I. CHỈ SỐ TỔNG HỢP', 'GIÁ TRỊ (VND)'],
    ['Tổng thu nhập (+):', summary.totalIncome],
    ['Tổng chi tiêu (-):', summary.totalExpense],
    ['Chênh lệch ròng (Thu - Chi):', summary.netSavings],
    ['Tổng số lượng giao dịch:', summary.transactionCount],
    ['Số giao dịch thu:', summary.incomeCount],
    ['Số giao dịch chi:', summary.expenseCount],
    [''],
    ['II. PHÂN BỔ THEO NGUỒN TIỀN', 'THU NHẬP (VND)', 'CHI TIÊU (VND)'],
    ['Ví tiền mặt', summary.accountSummary.walletIncome, summary.accountSummary.walletExpense],
    ['Tài khoản ngân hàng', summary.accountSummary.bankIncome, summary.accountSummary.bankExpense],
    [''],
    ['III. CƠ CẤU CHI TIÊU THEO DANH MỤC', 'SỐ GIAO DỊCH', 'TỔNG TIỀN (VND)', 'TỶ LỆ (%)'],
  ];

  summary.categoryBreakdown.forEach((item) => {
    overviewRows.push([
      tCategory(item.category),
      item.count,
      item.amount,
      `${item.percentage.toFixed(1)}%`,
    ]);
  });

  const wsOverview = XLSX.utils.aoa_to_sheet(overviewRows);

  // Set column widths for Overview
  wsOverview['!cols'] = [
    { wch: 36 },
    { wch: 22 },
    { wch: 22 },
    { wch: 16 },
  ];

  XLSX.utils.book_append_sheet(wb, wsOverview, 'Tổng quan');

  // 2. SHEET 2: BẢNG KÊ CHI TIẾT GIAO DỊCH (Transactions Sheet)
  const txHeader = [
    'STT',
    'Ngày',
    'Giờ',
    'Loại',
    'Danh mục',
    'Tài khoản',
    'Số tiền (VND)',
    'Ghi chú',
    'Có ảnh hóa đơn',
  ];

  const txRows: (string | number)[][] = [txHeader];

    filtered.forEach((tx, idx) => {
    txRows.push([
      idx + 1,
      formatDateVN(tx.date),
      formatTimeVN(tx.createdAt),
      tx.type === 'income' ? 'Thu nhập' : 'Chi tiêu',
      tCategory(tx.category),
      tx.account === 'wallet' ? 'Ví tiền mặt' : 'Ngân hàng',
      tx.type === 'income' ? tx.amount : -tx.amount,
      tx.note || '',
      tx.imageId ? 'Có' : 'Không',
    ]);
  });

  const wsTransactions = XLSX.utils.aoa_to_sheet(txRows);

  // Set column widths for Transactions
  wsTransactions['!cols'] = [
    { wch: 6 },  // STT
    { wch: 14 }, // Ngày
    { wch: 10 }, // Giờ
    { wch: 12 }, // Loại
    { wch: 18 }, // Danh mục
    { wch: 16 }, // Tài khoản
    { wch: 18 }, // Số tiền
    { wch: 30 }, // Ghi chú
    { wch: 16 }, // Có ảnh
  ];

  XLSX.utils.book_append_sheet(wb, wsTransactions, 'Chi tiết giao dịch');

  // Generate filename
  const fileName = `Bao_cao_tai_chinh_FIMA_${options.startDate}_den_${options.endDate}.xlsx`;

  // Write and trigger download
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

  // Mobile Web Share support or fallback download
  if (typeof navigator !== 'undefined' && navigator.canShare) {
    const file = new File([blob], fileName, { type: blob.type });
    if (navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: fileName,
        });
        return fileName;
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Share error fallback to link download:', err);
        } else {
          return fileName;
        }
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);

  return fileName;
}

/**
 * Generates an HTML report document string ready for printable preview or PDF conversion
 */
export function generateReportHtml(
  transactions: Transaction[],
  options: ReportFilterOptions,
  userSettings?: UserSettings | null,
  balances?: BalancesSummary
): string {
  const filtered = transactions
    .filter((t) => {
      if (t.date < options.startDate || t.date > options.endDate) return false;
      if (options.accountFilter !== 'all' && t.account !== options.accountFilter) return false;
      return true;
    })
    .sort((a, b) => {
      if (a.date !== b.date) return b.date.localeCompare(a.date);
      return (b.createdAt || '').localeCompare(a.createdAt || '');
    });

  const summary = calculateReportSummary(transactions, options);
  const userName = userSettings?.nickname || 'Chủ tài khoản';
  const accountLabel =
    options.accountFilter === 'all'
      ? 'Tất cả tài khoản'
      : options.accountFilter === 'wallet'
      ? 'Ví tiền mặt'
      : 'Tài khoản ngân hàng';

  const categoryRowsHtml = summary.categoryBreakdown
    .map((item, idx) => {
      return `
      <tr>
        <td style="padding: 9px 10px; border-bottom: 1px solid #e5e7eb; font-weight: 600; color: #111827; text-align: left;">
          ${idx + 1}. ${tCategory(item.category)}
        </td>
        <td style="padding: 9px 10px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #4b5563;">
          ${item.count}
        </td>
        <td style="padding: 9px 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 700; color: #dc2626; white-space: nowrap;">
          −${formatVND(item.amount)}
        </td>
        <td style="padding: 9px 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 600; color: #4b5563;">
          ${item.percentage.toFixed(1)}%
        </td>
        <td style="padding: 9px 10px; border-bottom: 1px solid #e5e7eb; text-align: left;">
          <div style="background-color: #f3f4f6; height: 8px; border-radius: 9999px; overflow: hidden; width: 100%;">
            <div style="background-color: #ef4444; height: 8px; width: ${Math.min(100, Math.max(3, item.percentage))}%;"></div>
          </div>
        </td>
      </tr>
    `;
    })
    .join('');

  const transactionRowsHtml = filtered
    .map((tx, idx) => {
      const isIncome = tx.type === 'income';
      const color = isIncome ? '#16a34a' : '#dc2626';
      const sign = isIncome ? '+' : '−';
      const timeStr = formatTimeVN(tx.createdAt);
      return `
      <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f9fafb'};">
        <td style="padding: 9px 8px; border-bottom: 1px solid #e5e7eb; text-align: center; color: #6b7280; font-size: 12px;">
          ${idx + 1}
        </td>
        <td style="padding: 9px 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px; text-align: left; white-space: nowrap;">
          <strong style="color: #111827;">${formatDateVN(tx.date)}</strong>
          ${timeStr ? `<div style="font-size: 11px; color: #6b7280; margin-top: 1px;">${timeStr}</div>` : ''}
        </td>
        <td style="padding: 9px 8px; border-bottom: 1px solid #e5e7eb; font-size: 12px; text-align: center;">
          <span style="display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 11px; font-weight: 700; background-color: ${isIncome ? '#dcfce7' : '#fee2e2'}; color: ${color};">
            ${isIncome ? 'Thu' : 'Chi'}
          </span>
        </td>
        <td style="padding: 9px 10px; border-bottom: 1px solid #e5e7eb; font-weight: 600; font-size: 13px; text-align: left; color: #111827;">
          ${tCategory(tx.category)}
        </td>
        <td style="padding: 9px 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px; text-align: left; color: #4b5563;">
          ${tx.account === 'wallet' ? '💵 Ví tiền mặt' : '🏦 Ngân hàng'}
        </td>
        <td style="padding: 9px 10px; border-bottom: 1px solid #e5e7eb; font-size: 12px; text-align: left; color: #4b5563;">
          ${tx.note ? `<span>${tx.note}</span>` : '<span style="color: #9ca3af; font-style: italic;">—</span>'}
        </td>
        <td style="padding: 9px 10px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 700; font-size: 13px; color: ${color}; white-space: nowrap;">
          ${sign}${formatVND(tx.amount)}
        </td>
      </tr>
    `;
    })
    .join('');

  return `
<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Báo cáo tài chính FIMA - ${formatDateVN(options.startDate)} đến ${formatDateVN(options.endDate)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 12mm 12mm 12mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    html, body {
      margin: 0;
      padding: 0;
      background-color: #ffffff;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #111827;
      font-size: 13px;
      line-height: 1.5;
    }
    .print-actions-bar {
      background: #1e293b;
      color: #ffffff;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-bottom: 2px solid #0f172a;
      position: sticky;
      top: 0;
      z-index: 1000;
    }
    .btn-save-pdf {
      background: #10b981;
      color: #ffffff;
      border: none;
      padding: 8px 18px;
      border-radius: 8px;
      font-weight: 700;
      font-size: 13px;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 6px;
      transition: background 0.2s;
    }
    .btn-save-pdf:hover {
      background: #059669;
    }
    .report-container {
      width: 100%;
      max-width: 820px;
      margin: 0 auto;
      padding: 20px 16px 32px 16px;
    }
    .header {
      width: 100%;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #111827;
      padding-bottom: 14px;
      margin-bottom: 18px;
    }
    .brand-title {
      font-size: 22px;
      font-weight: 800;
      letter-spacing: -0.5px;
      color: #111827;
      margin: 0;
      line-height: 1.2;
    }
    .brand-subtitle {
      font-size: 11px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      margin-top: 3px;
      font-weight: 600;
    }
    .meta-box {
      text-align: right;
      font-size: 12px;
      color: #4b5563;
      line-height: 1.6;
    }
    .meta-box strong {
      color: #111827;
    }
    .kpi-grid {
      width: 100%;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 20px;
    }
    .kpi-card {
      border: 1px solid #e5e7eb;
      border-radius: 10px;
      padding: 12px 14px;
      background: #f9fafb;
    }
    .kpi-title {
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 4px;
    }
    .kpi-value {
      font-size: 18px;
      font-weight: 800;
      line-height: 1.2;
    }
    .kpi-sub {
      font-size: 11px;
      color: #6b7280;
      margin-top: 3px;
    }
    .section-title {
      width: 100%;
      font-size: 13px;
      font-weight: 700;
      color: #111827;
      margin: 22px 0 10px 0;
      display: flex;
      align-items: center;
      justify-content: space-between;
      border-left: 3px solid #111827;
      padding-left: 8px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 20px;
      table-layout: fixed;
    }
    th {
      background-color: #f3f4f6;
      color: #374151;
      font-weight: 700;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 9px 8px;
      border-top: 1px solid #e5e7eb;
      border-bottom: 2px solid #d1d5db;
    }
    .footer {
      width: 100%;
      border-top: 1px solid #e5e7eb;
      padding-top: 12px;
      margin-top: 24px;
      display: flex;
      justify-content: space-between;
      color: #9ca3af;
      font-size: 11px;
    }
    @media print {
      body {
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
      .report-container {
        max-width: 100%;
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <!-- Top Action Bar for Screen / Iframe Preview (Hidden during print) -->
  <div class="print-actions-bar no-print">
    <div style="display: flex; align-items: center; gap: 8px; font-size: 13px; font-weight: 600;">
      <span>📑 Xem trước bản in A4</span>
      <span style="font-size: 11px; color: #94a3b8; font-weight: normal;">• Chọn "Lưu dưới dạng PDF" (Save as PDF) tại hộp thoại in</span>
    </div>
    <button type="button" onclick="window.print()" class="btn-save-pdf">
      <span>🖨️ Lưu Báo Cáo / In PDF</span>
    </button>
  </div>

  <div class="report-container">
    <!-- Header -->
    <div class="header">
      <div>
        <h1 class="brand-title">FIMA • BÁO CÁO TÀI CHÍNH</h1>
        <div class="brand-subtitle">Quản lý chi tiêu & Dòng tiền cá nhân</div>
      </div>
      <div class="meta-box">
        <div>Kỳ báo cáo: <strong>${formatDateVN(options.startDate)} – ${formatDateVN(options.endDate)}</strong></div>
        <div>Tài khoản: <strong>${accountLabel}</strong></div>
        <div>Người lập: <strong>${userName}</strong></div>
        <div>Ngày xuất: <strong>${new Date().toLocaleDateString('vi-VN')}</strong></div>
      </div>
    </div>

    <!-- KPI Summary Cards -->
    <div class="kpi-grid">
      <div class="kpi-card" style="border-left: 4px solid #16a34a; background: #f0fdf4;">
        <div class="kpi-title" style="color: #15803d;">Tổng Thu Nhập</div>
        <div class="kpi-value" style="color: #16a34a;">+${formatVND(summary.totalIncome)}</div>
        <div class="kpi-sub">${summary.incomeCount} giao dịch thu</div>
      </div>

      <div class="kpi-card" style="border-left: 4px solid #dc2626; background: #fef2f2;">
        <div class="kpi-title" style="color: #b91c1c;">Tổng Chi Tiêu</div>
        <div class="kpi-value" style="color: #dc2626;">−${formatVND(summary.totalExpense)}</div>
        <div class="kpi-sub">${summary.expenseCount} giao dịch chi</div>
      </div>

      <div class="kpi-card" style="border-left: 4px solid ${summary.netSavings >= 0 ? '#2563eb' : '#ea580c'}; background: ${summary.netSavings >= 0 ? '#eff6ff' : '#fff7ed'};">
        <div class="kpi-title" style="color: ${summary.netSavings >= 0 ? '#1d4ed8' : '#c2410c'};">Thặng Dư / Tiết Kiệm</div>
        <div class="kpi-value" style="color: ${summary.netSavings >= 0 ? '#2563eb' : '#ea580c'};">
          ${summary.netSavings >= 0 ? '+' : '−'}${formatVND(Math.abs(summary.netSavings))}
        </div>
        <div class="kpi-sub">
          ${summary.totalIncome > 0 ? `Tỷ lệ tích lũy: ${((summary.netSavings / summary.totalIncome) * 100).toFixed(1)}%` : 'Không có thu nhập'}
        </div>
      </div>
    </div>

    <!-- Category Breakdown Table -->
    ${
      summary.categoryBreakdown.length > 0
        ? `
      <div class="section-title">
        <span>CƠ CẤU CHI TIÊU THEO DANH MỤC</span>
        <span style="font-size: 11px; font-weight: normal; color: #6b7280;">(Xếp theo số tiền lớn nhất)</span>
      </div>
      <table>
        <thead>
          <tr>
            <th style="width: 32%; text-align: left;">Danh mục</th>
            <th style="width: 14%; text-align: center;">Số lượng</th>
            <th style="width: 22%; text-align: right;">Tổng chi</th>
            <th style="width: 12%; text-align: right;">Tỷ lệ</th>
            <th style="width: 20%; text-align: left;">Biểu đồ</th>
          </tr>
        </thead>
        <tbody>
          ${categoryRowsHtml}
        </tbody>
      </table>
    `
        : ''
    }

    <!-- Detailed Transactions Table -->
    <div class="section-title">
      <span>NHẬT KÝ CHI TIẾT GIAO DỊCH (${filtered.length})</span>
      <span style="font-size: 11px; font-weight: normal; color: #6b7280;">Thứ tự mới nhất trước</span>
    </div>
    ${
      filtered.length > 0
        ? `
      <table>
        <thead>
          <tr>
            <th style="width: 6%; text-align: center;">#</th>
            <th style="width: 16%; text-align: left;">Thời gian</th>
            <th style="width: 10%; text-align: center;">Loại</th>
            <th style="width: 18%; text-align: left;">Danh mục</th>
            <th style="width: 14%; text-align: left;">Nguồn tiền</th>
            <th style="width: 20%; text-align: left;">Ghi chú</th>
            <th style="width: 16%; text-align: right;">Số tiền</th>
          </tr>
        </thead>
        <tbody>
          ${transactionRowsHtml}
        </tbody>
      </table>
    `
        : '<p style="text-align: center; color: #9ca3af; padding: 24px;">Không có giao dịch nào trong khoảng thời gian này.</p>'
    }

    <!-- Footer -->
    <div class="footer">
      <div>Được tạo tự động từ ứng dụng FIMA - Quản lý chi tiêu thông minh</div>
      <div>Bản in chuẩn báo cáo tài chính</div>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Triggers native print preview dialog for PDF generation
 */
export function printReportPdf(
  transactions: Transaction[],
  options: ReportFilterOptions,
  userSettings?: UserSettings | null,
  balances?: BalancesSummary
): void {
  const html = generateReportHtml(transactions, options, userSettings, balances);
  
  // Create hidden iframe approach for 100% reliable printing across iframes & browsers
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentWindow?.document;
    if (doc) {
      doc.open();
      doc.write(html);
      doc.close();

      setTimeout(() => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          console.warn('Iframe print failed, falling back to popup window:', e);
          const printWindow = window.open('', '_blank');
          if (printWindow) {
            printWindow.document.open();
            printWindow.document.write(html);
            printWindow.document.close();
            printWindow.onload = () => {
              printWindow.focus();
              printWindow.print();
            };
          }
        } finally {
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 3000);
        }
      }, 350);
    }
  } catch (err) {
    console.error('Print PDF error:', err);
  }
}
