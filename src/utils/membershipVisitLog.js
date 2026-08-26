import * as XLSX from "xlsx";

// The currently active package is represented by the most recent purchase/recharge
// transaction (transactions are sorted newest-first by MembershipDetail's fetch).
const getActivePackageTxn = (transactions = []) =>
  transactions.find((t) => t.type === "purchase" || t.type === "recharge") || null;

// Builds and downloads a printable "Membership Visit Log" .xlsx for one member —
// header details (including original amount paid + active package start date) up top,
// then blank Date / Name / Sign rows for reception to fill in by hand on each visit.
export const downloadMembershipVisitLog = (membership, transactions = []) => {
  const customer = membership.customerId || {};
  const activeTxn = getActivePackageTxn(transactions);

  const originalAmount = activeTxn?.amountPaid ?? membership.packageId?.price ?? null;
  const packageStartDate = activeTxn?.createdAt || membership.createdAt;

  const rows = [
    ["Orange International Spa", "", ""],
    ["Membership Visit Log", "", ""],
    ["", "", ""],
    ["Name", customer.name || "", ""],
    ["Membership No", membership.membershipId || "", ""],
    ["Phone Number", customer.mobileNumber || "", ""],
    ["Tier / Package", membership.tier || "", ""],
    ["Original Amount Paid", originalAmount != null ? originalAmount : "—", ""],
    ["Package Start Date", packageStartDate ? new Date(packageStartDate) : "", ""],
    ["Valid Until", membership.expiresAt ? new Date(membership.expiresAt) : "No expiry", ""],
    ["Status", membership.status || "", ""],
    ["", "", ""],
    ["Date", "Name", "Sign"],
  ];

  // Row indices (0-based) of cells that need real Date/Number types instead of plain text,
  // so Excel formats and right-aligns them correctly instead of showing raw strings.
  const ORIGINAL_AMOUNT_ROW = 7;
  const PACKAGE_START_ROW = 8;
  const VALID_UNTIL_ROW = 9;

  for (let i = 0; i < 50; i++) rows.push(["", "", ""]);

  const worksheet = XLSX.utils.aoa_to_sheet(rows);

  worksheet["!cols"] = [{ wch: 22 }, { wch: 28 }, { wch: 22 }];
  worksheet["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 2 } }, // spa name spans all 3 columns
    { s: { r: 1, c: 0 }, e: { r: 1, c: 2 } }, // "Membership Visit Log" spans all 3 columns
  ];

  const amountRef = XLSX.utils.encode_cell({ r: ORIGINAL_AMOUNT_ROW, c: 1 });
  if (worksheet[amountRef] && typeof originalAmount === "number") {
    worksheet[amountRef].t = "n";
    worksheet[amountRef].z = "₹#,##0";
  }

  const startDateRef = XLSX.utils.encode_cell({ r: PACKAGE_START_ROW, c: 1 });
  if (worksheet[startDateRef] && packageStartDate) {
    worksheet[startDateRef].t = "d";
    worksheet[startDateRef].z = "dd-mmm-yyyy";
  }

  const validUntilRef = XLSX.utils.encode_cell({ r: VALID_UNTIL_ROW, c: 1 });
  if (worksheet[validUntilRef] && membership.expiresAt) {
    worksheet[validUntilRef].t = "d";
    worksheet[validUntilRef].z = "dd-mmm-yyyy";
  }

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Visit Log");

  const safeName = (customer.name || "member").replace(/[^a-z0-9]+/gi, "_");
  XLSX.writeFile(workbook, `${safeName}_visit_log.xlsx`);
};