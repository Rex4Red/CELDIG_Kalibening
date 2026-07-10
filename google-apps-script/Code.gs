/**
 * ============================================
 * CELDIG — Google Apps Script Backend
 * ============================================
 * 
 * CARA PAKAI:
 * 1. Buka Google Spreadsheet yang sudah dibuat
 * 2. Menu: Extensions → Apps Script
 * 3. Hapus kode default, paste SELURUH isi file ini
 * 4. Klik tombol "Run" (▶️) dan pilih fungsi "initSheets" → jalankan
 * 5. Beri izin akses saat diminta
 * 6. Deploy: Deploy → New Deployment → Type: Web App
 *    - Execute as: Me
 *    - Who has access: Anyone
 * 7. Copy URL deployment, paste ke file js/config.js
 */

// ===========================================
// INIT — Jalankan sekali untuk setup sheets
// ===========================================
function initSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Sheet: Registry
  let reg = ss.getSheetByName('Registry');
  if (!reg) {
    reg = ss.insertSheet('Registry');
    reg.appendRow(['qr_id', 'name', 'class', 'registered_at']);
    reg.getRange('A1:D1').setFontWeight('bold').setBackground('#4CC9F0').setFontColor('#fff');
    reg.setColumnWidth(1, 120);
    reg.setColumnWidth(2, 200);
    reg.setColumnWidth(3, 100);
    reg.setColumnWidth(4, 180);
  }
  
  // Sheet: Deposits
  let dep = ss.getSheetByName('Deposits');
  if (!dep) {
    dep = ss.insertSheet('Deposits');
    dep.appendRow(['deposit_id', 'qr_id', 'name', 'amount', 'points', 'operator', 'created_at']);
    dep.getRange('A1:G1').setFontWeight('bold').setBackground('#FF9F1C').setFontColor('#fff');
    dep.setColumnWidth(1, 150);
    dep.setColumnWidth(2, 120);
    dep.setColumnWidth(3, 200);
    dep.setColumnWidth(4, 120);
    dep.setColumnWidth(5, 80);
    dep.setColumnWidth(6, 150);
    dep.setColumnWidth(7, 180);
  }
  
  // Sheet: Config
  let cfg = ss.getSheetByName('Config');
  if (!cfg) {
    cfg = ss.insertSheet('Config');
    cfg.appendRow(['key', 'value']);
    cfg.getRange('A1:B1').setFontWeight('bold').setBackground('#F72585').setFontColor('#fff');
    cfg.appendRow(['admin_pin', '1234']);
    cfg.appendRow(['next_qr_number', '1']);
    cfg.appendRow(['school_name', 'SD N Kalibening']);
    cfg.setColumnWidth(1, 200);
    cfg.setColumnWidth(2, 200);
  }
  
  // Delete default Sheet1 if exists
  const sheet1 = ss.getSheetByName('Sheet1');
  if (sheet1 && ss.getSheets().length > 1) {
    ss.deleteSheet(sheet1);
  }
  
  SpreadsheetApp.getUi().alert('✅ Setup selesai! Sheet Registry, Deposits, dan Config sudah dibuat.');
}

// ===========================================
// WEB APP HANDLERS
// ===========================================
function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const headers = { 'Access-Control-Allow-Origin': '*' };
  
  try {
    let action, params;
    
    if (e.postData) {
      const body = JSON.parse(e.postData.contents);
      action = body.action;
      params = body;
    } else {
      action = e.parameter.action;
      params = e.parameter;
    }
    
    let result;
    switch (action) {
      case 'getChild':      result = getChild(params.qrId); break;
      case 'register':      result = registerChild(params.qrId, params.name, params.className); break;
      case 'deposit':       result = recordDeposit(params.qrId, params.amount, params.operator); break;
      case 'withdraw':      result = recordWithdraw(params.qrId, params.amount, params.operator); break;
      case 'getStats':      result = getStats(); break;
      case 'getStudents':   result = getStudents(); break;
      case 'getLeaderboard':result = getLeaderboard(params.period); break;
      case 'generateQRs':   result = generateQRs(params.count); break;
      case 'getQRList':     result = getQRList(params.status); break;
      case 'verifyPin':     result = verifyPin(params.pin); break;
      case 'getHistory':    result = getHistory(params.qrId); break;
      case 'deleteStudent': result = deleteStudent(params.qrId); break;
      case 'getSheetUrl':   result = getSheetUrl(); break;
      default: result = { error: 'Unknown action: ' + action };
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
      
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ===========================================
// API FUNCTIONS
// ===========================================

/**
 * Cek data anak berdasarkan QR ID
 */
function getChild(qrId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const reg = ss.getSheetByName('Registry');
  const data = reg.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === qrId) {
      if (!data[i][1]) {
        return { registered: false, qrId: qrId };
      }
      
      // Get balance & points
      const deposits = getDepositsForChild(qrId);
      const balance = deposits.reduce((sum, d) => sum + d.amount, 0);
      const points = deposits.length; // frequency-based: 1 deposit = 1 point
      
      return {
        registered: true,
        qrId: qrId,
        name: data[i][1],
        className: data[i][2],
        balance: balance,
        points: points,
        depositCount: deposits.length,
        history: deposits.slice(-5).reverse()
      };
    }
  }
  
  return { error: 'QR ID tidak ditemukan', registered: false };
}

/**
 * Daftarkan siswa baru ke QR ID
 */
function registerChild(qrId, name, className) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const reg = ss.getSheetByName('Registry');
  const data = reg.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === qrId) {
      if (data[i][1]) {
        return { error: 'QR sudah terdaftar atas nama: ' + data[i][1] };
      }
      // Update row
      reg.getRange(i + 1, 2).setValue(name);
      reg.getRange(i + 1, 3).setValue(className || '');
      reg.getRange(i + 1, 4).setValue(new Date().toISOString());
      
      return { success: true, name: name, className: className };
    }
  }
  
  return { error: 'QR ID tidak ditemukan' };
}

/**
 * Catat setoran tabungan
 */
function recordDeposit(qrId, amount, operator) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dep = ss.getSheetByName('Deposits');
  const reg = ss.getSheetByName('Registry');
  
  // Get child name
  const regData = reg.getDataRange().getValues();
  let childName = '';
  for (let i = 1; i < regData.length; i++) {
    if (regData[i][0] === qrId) {
      childName = regData[i][1];
      break;
    }
  }
  
  if (!childName) return { error: 'Siswa belum terdaftar' };
  
  const depositId = 'DEP-' + Date.now();
  const now = new Date().toISOString();
  
  dep.appendRow([depositId, qrId, childName, Number(amount), 1, operator || 'Guru', now]);
  
  // Calculate new totals
  const allDeposits = getDepositsForChild(qrId);
  const newBalance = allDeposits.reduce((sum, d) => sum + d.amount, 0);
  const newPoints = allDeposits.length;
  
  return {
    success: true,
    depositId: depositId,
    newBalance: newBalance,
    newPoints: newPoints
  };
}

/**
 * Catat penarikan tabungan (withdrawal)
 */
function recordWithdraw(qrId, amount, operator) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dep = ss.getSheetByName('Deposits');
  const reg = ss.getSheetByName('Registry');
  
  // Get child name
  const regData = reg.getDataRange().getValues();
  let childName = '';
  for (let i = 1; i < regData.length; i++) {
    if (regData[i][0] === qrId) {
      childName = regData[i][1];
      break;
    }
  }
  
  if (!childName) return { error: 'Siswa belum terdaftar' };
  
  // Check current balance
  const allDeposits = getDepositsForChild(qrId);
  const currentBalance = allDeposits.reduce((sum, d) => sum + d.amount, 0);
  const withdrawAmount = Number(amount);
  
  if (withdrawAmount > currentBalance) {
    return { error: 'Saldo tidak mencukupi. Saldo saat ini: Rp ' + currentBalance.toLocaleString('id-ID') };
  }
  
  const withdrawId = 'WDR-' + Date.now();
  const now = new Date().toISOString();
  
  // Record as NEGATIVE amount, 0 points
  dep.appendRow([withdrawId, qrId, childName, -withdrawAmount, 0, operator || 'Guru', now]);
  
  const newBalance = currentBalance - withdrawAmount;
  const newPoints = allDeposits.filter(d => d.amount > 0).length; // only count deposits
  
  return {
    success: true,
    withdrawId: withdrawId,
    newBalance: newBalance,
    newPoints: newPoints
  };
}

/**
 * Ambil statistik dashboard
 */
function getStats() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const reg = ss.getSheetByName('Registry');
  const dep = ss.getSheetByName('Deposits');
  
  const regData = reg.getDataRange().getValues();
  const depData = dep.getDataRange().getValues();
  
  let totalStudents = 0;
  for (let i = 1; i < regData.length; i++) {
    if (regData[i][1]) totalStudents++;
  }
  
  let totalSavings = 0;
  for (let i = 1; i < depData.length; i++) {
    totalSavings += Number(depData[i][3]) || 0;
  }
  
  return {
    totalStudents: totalStudents,
    totalDeposits: Math.max(0, depData.length - 1),
    totalSavings: totalSavings
  };
}

/**
 * Ambil daftar semua siswa + saldo
 */
function getStudents() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const reg = ss.getSheetByName('Registry');
  const dep = ss.getSheetByName('Deposits');
  
  const regData = reg.getDataRange().getValues();
  const depData = dep.getDataRange().getValues();
  
  // Build deposit map
  const depositMap = {};
  for (let i = 1; i < depData.length; i++) {
    const qr = depData[i][1];
    if (!depositMap[qr]) depositMap[qr] = { balance: 0, points: 0 };
    depositMap[qr].balance += Number(depData[i][3]) || 0;
    depositMap[qr].points++;
  }
  
  const students = [];
  for (let i = 1; i < regData.length; i++) {
    if (regData[i][1]) {
      const qr = regData[i][0];
      const d = depositMap[qr] || { balance: 0, points: 0 };
      students.push({
        qrId: qr,
        name: regData[i][1],
        className: regData[i][2],
        balance: d.balance,
        points: d.points
      });
    }
  }
  
  // Sort by balance desc
  students.sort((a, b) => b.balance - a.balance);
  return { students: students };
}

/**
 * Ambil data leaderboard (frequency-based points)
 */
function getLeaderboard(period) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dep = ss.getSheetByName('Deposits');
  const depData = dep.getDataRange().getValues();
  
  const now = new Date();
  const pointsMap = {};
  
  for (let i = 1; i < depData.length; i++) {
    const createdAt = new Date(depData[i][6]);
    
    // Filter by period
    if (period === 'weekly') {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      if (createdAt < weekAgo) continue;
    } else if (period === 'monthly') {
      if (createdAt.getMonth() !== now.getMonth() || createdAt.getFullYear() !== now.getFullYear()) continue;
    }
    
    const name = depData[i][2];
    const qr = depData[i][1];
    if (!pointsMap[qr]) pointsMap[qr] = { name: name, points: 0 };
    pointsMap[qr].points++;
  }
  
  const leaderboard = Object.values(pointsMap);
  leaderboard.sort((a, b) => b.points - a.points);
  
  return { leaderboard: leaderboard.slice(0, 10) };
}

/**
 * Generate QR IDs baru
 */
function generateQRs(count) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const reg = ss.getSheetByName('Registry');
  const cfg = ss.getSheetByName('Config');
  
  // Get next QR number
  const cfgData = cfg.getDataRange().getValues();
  let nextNum = 1;
  let nextNumRow = -1;
  for (let i = 1; i < cfgData.length; i++) {
    if (cfgData[i][0] === 'next_qr_number') {
      nextNum = parseInt(cfgData[i][1]) || 1;
      nextNumRow = i + 1;
      break;
    }
  }
  
  const num = parseInt(count) || 10;
  const qrIds = [];
  
  for (let i = 0; i < num; i++) {
    const id = 'QR-' + String(nextNum).padStart(4, '0');
    reg.appendRow([id, '', '', '']);
    qrIds.push(id);
    nextNum++;
  }
  
  // Update next_qr_number
  if (nextNumRow > 0) {
    cfg.getRange(nextNumRow, 2).setValue(nextNum);
  }
  
  return { success: true, qrIds: qrIds, count: num };
}

/**
 * Ambil daftar QR
 */
function getQRList(status) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const reg = ss.getSheetByName('Registry');
  const data = reg.getDataRange().getValues();
  
  const qrs = [];
  for (let i = 1; i < data.length; i++) {
    const registered = !!data[i][1];
    if (status === 'registered' && !registered) continue;
    if (status === 'unregistered' && registered) continue;
    qrs.push({ qrId: data[i][0], name: data[i][1], className: data[i][2], registered: registered });
  }
  
  return { qrs: qrs };
}

/**
 * Verifikasi PIN admin
 */
function verifyPin(pin) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const cfg = ss.getSheetByName('Config');
  const data = cfg.getDataRange().getValues();
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === 'admin_pin') {
      return { valid: String(data[i][1]) === String(pin) };
    }
  }
  
  return { valid: false };
}

/**
 * Ambil riwayat setoran per anak
 */
function getHistory(qrId) {
  const deposits = getDepositsForChild(qrId);
  return { history: deposits.reverse() };
}

// ===========================================
// HELPER
// ===========================================
function getDepositsForChild(qrId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const dep = ss.getSheetByName('Deposits');
  const data = dep.getDataRange().getValues();
  
  const deposits = [];
  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === qrId) {
      deposits.push({
        deposit_id: data[i][0],
        amount: Number(data[i][3]) || 0,
        points: Number(data[i][4]) || 0,
        operator: data[i][5],
        created_at: data[i][6]
      });
    }
  }
  
  return deposits;
}

// ===========================================
// DELETE STUDENT — Hapus 1 siswa + setorannya
// ===========================================
function deleteStudent(qrId) {
  if (!qrId) return { error: 'qrId diperlukan' };
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Delete from Registry
  const reg = ss.getSheetByName('Registry');
  const regData = reg.getDataRange().getValues();
  let deleted = false;
  for (let i = regData.length - 1; i >= 1; i--) {
    if (regData[i][0] === qrId) {
      reg.deleteRow(i + 1);
      deleted = true;
      break;
    }
  }
  
  if (!deleted) return { error: 'Siswa tidak ditemukan' };
  
  // Delete all deposits for this qrId
  const dep = ss.getSheetByName('Deposits');
  const depData = dep.getDataRange().getValues();
  for (let i = depData.length - 1; i >= 1; i--) {
    if (depData[i][1] === qrId) {
      dep.deleteRow(i + 1);
    }
  }
  
  return { success: true, message: 'Siswa dan setorannya berhasil dihapus.' };
}

// ===========================================
// GET SHEET URL
// ===========================================
function getSheetUrl() {
  return { url: SpreadsheetApp.getActiveSpreadsheet().getUrl() };
}

