const SHEET_NAME = "Data";
const FOLDER_ID = "1G2fx6Ko9osMJr6T119qbsJvfsN_ePT-F"; // Folder សម្រាប់ឯកសារចូល (docIn)
const FOLDER_OUT_ID = "182yZpL15Vkje0UOsHhxeDmIRdbzMwkIm"; // Folder សម្រាប់ឯកសារចេញ (docOut)

function doGet(e) {
  try {
    // === ដាក់កូដ/Logic របស់អ្នកនៅត្រង់នេះ ===
    // ឧទាហរណ៍៖ អានទិន្នន័យ, ផ្ញើសារ Telegram, Update Google Sheet, κ.ល.
    
    var responseData = {
      status: "success",
      message: "Google Apps Script ត្រូវបានហៅមកដំណើរការដោយជោគជ័យ!",
      timestamp: new Date().toLocaleString()
    };

    // បំប្លែងទិន្នន័យជា JSON ត្រឡប់ទៅវិញ
    return ContentService.createTextOutput(JSON.stringify(responseData))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    var errorData = {
      status: "error",
      message: error.toString()
    };
    
    return ContentService.createTextOutput(JSON.stringify(errorData))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function uploadFileToDrive(fileData, priority, dateIn, timeIn) {
  try {
    const folder = DriveApp.getFolderById(FOLDER_ID);
    
    let base64String = fileData.data || fileData.url;
    if (!base64String || !base64String.includes(',')) {
      throw new Error("ទិន្នន័យឯកសារ Base64 មិនត្រឹមត្រូវ។");
    }
    
    const parts = base64String.split(',');
    const contentType = parts[0].match(/:(.*?);/)[1];
    const decodedData = Utilities.base64Decode(parts[1]);
    const blob = Utilities.newBlob(decodedData, contentType, fileData.name);
    
    const cleanDateIn = (dateIn || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd")).toString().trim();
    const cleanTimeIN = (timeIn || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "HH-mm")).toString().trim().replace(/:/g, '-');
    const extension = fileData.name.split('.').pop();
    
    blob.setName(`ឯកសារចូល_${cleanDateIn}_${cleanTimeIN}.${extension}`);
    
    const file = folder.createFile(blob);
    return {
      success: true,
      name: file.getName(),
      url: file.getUrl()
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

// មុខងារ Upload File ចូល Folder ឯកសារចេញ (docOut) តាម Column 14 (dateOut) និង 15 (timeOut)
function uploadOutFileToDrive(fileData, dateOut, timeOut) {
  try {
    const folder = DriveApp.getFolderById(FOLDER_OUT_ID);
    
    let base64String = fileData.data || fileData.url;
    if (!base64String || !base64String.includes(',')) {
      throw new Error("ទិន្នន័យឯកសារ Base64 មិនត្រឹមត្រូវ។");
    }
    
    const parts = base64String.split(',');
    const contentType = parts[0].match(/:(.*?);/)[1];
    const decodedData = Utilities.base64Decode(parts[1]);
    const blob = Utilities.newBlob(decodedData, contentType, fileData.name);
    
    const cleanDateOut = (dateOut || Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd")).toString().trim();
    const cleanTimeOut = (timeOut || "00-00").toString().trim().replace(/:/g, '-');
    const extension = fileData.name.split('.').pop();
    
    blob.setName(`ឯកសារចេញ_${cleanDateOut}_${cleanTimeOut}.${extension}`);
    
    const file = folder.createFile(blob);
    return {
      success: true,
      name: file.getName(),
      url: file.getUrl()
    };
  } catch (error) {
    return {
      success: false,
      message: error.message
    };
  }
}

// មុខងារទាញទិន្នន័យពី Sheet
function openDetail(id) {
      const r = ALL_RECORDS.find(item => item.id === id);
      if (!r) return;

      document.getElementById('det_incomingNo').textContent = r.incomingNo || '–';
      document.getElementById('det_subject').textContent = r.subject || '–';
      document.getElementById('det_docType').textContent = r.docType || '–';
      document.getElementById('det_dateIn').textContent = r.dateIn || '–';
      document.getElementById('det_dateOut').textContent = r.dateOut || 'មិនទាន់ចេញ';
      document.getElementById('det_expiryDate').textContent = r.expiryDate || 'មិនបានកំណត់';
      document.getElementById('det_incomingRemark').textContent = r.incomingRemark || 'គ្មានចំណាំ';
      document.getElementById('det_finishRemark').textContent = r.finishRemark || 'គ្មានចំណាំ';

      if (r.dateIn && r.dateOut) {
        const dIn = new Date(r.dateIn);
        const dOut = new Date(r.dateOut);
        const diffTime = dOut - dIn;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        document.getElementById('det_durationDays').textContent = diffDays >= 0 ? diffDays + ' ថ្ងៃ' : 'កាលបរិច្ឆេទមិនត្រឹមត្រូវ';
      } else {
        document.getElementById('det_durationDays').textContent = 'កំពុងដំណើរការ...';
      }

      document.getElementById('det_users').innerHTML = `ដាក់៖ ${r.submittedBy || '–'} &nbsp;|&nbsp; ទទួល៖ ${r.receivedBy || '–'}`;

      // ត្រងកុំឱ្យទាញយកឯកសារដែលបានលុបចេញពី Trash មកបង្ហាញក្នុងប្រអប់
      google.script.run.withSuccessHandler(checkedFiles => {
        renderFilesPreviewContainer('det_imgIn', checkedFiles);
      }).getCheckedFilesData(r.imageIn || "");

      google.script.run.withSuccessHandler(checkedFiles => {
        renderFilesPreviewContainer('det_imgOut', checkedFiles);
      }).getCheckedFilesData(r.imageOut || "");

      document.getElementById('detailOverlay').classList.add('show');
    }

// មុខងាររក្សាទុក ឬកែប្រែទិន្នន័យ (កែសម្រួលឱ្យមានសុវត្ថិភាពទប់ស្កាត់ Error មិនឱ្យទຶល data គ្មាន id)
function saveRecord(data) {
  // បន្ថែមការផ្ទៀងផ្ទាត់ការពារក្រែងលោ data មិនត្រូវបានបញ្ជូនមក (Undefined)
  if (!data) {
    return { success: false, message: "មិនមានទិន្នន័យសម្រាប់រក្សាទុកទេ!" };
  }

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  
  const defaultHeaders = ["id", "incomingNo", "subject", "source", "priority", "dateIn", "timeIn", "submittedBy", "receivedBy", "imageIn", "docType", "status", "validity", "dateOut", "timeOut", "imageOut", "outStatus"];

  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(defaultHeaders);
  }

  const rows = sheet.getDataRange().getValues();
  let headers = rows.length > 0 ? rows[0] : defaultHeaders;

  // កែតម្រូវត្រង់ចំណុចនេះ ដើម្បីការពារ Error ពេល id គ្មានតម្លៃ
  let recordId = data.id || '';
  let rowIndex = -1;

  if (recordId && rows.length > 1) {
    const idColIndex = headers.indexOf('id');
    if (idColIndex !== -1) {
      for (let i = 1; i < rows.length; i++) {
        if (rows[i][idColIndex] === recordId) {
          rowIndex = i + 1;
          break;
        }
      }
    }
  }

  if (!recordId) {
    recordId = 'DOC-' + Date.now();
    data.id = recordId;
  }

  let rowData = [];
  for (let j = 0; j < headers.length; j++) {
    let key = headers[j];
    let val = data[key] !== undefined ? data[key] : "";
    rowData.push(val);
  }

  if (rowIndex > 0) {
    // ករណីកែប្រែទិន្នន័យចាស់ (Update)
    let existingRow = rows[rowIndex - 1];
    let imgInIdx = headers.indexOf('imageIn');
    let imgOutIdx = headers.indexOf('imageOut');
    
    if (!data.imageIn && imgInIdx !== -1) {
      rowData[imgInIdx] = existingRow[imgInIdx];
    }
    if (!data.imageOut && imgOutIdx !== -1) {
      rowData[imgOutIdx] = existingRow[imgOutIdx];
    }
    
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    // ករណីបន្ថែមថ្មី (Insert ចូលជួរទី ២ ដើម្បីឱ្យស្ថិតនៅលើគេបង្អស់)
    if (sheet.getLastRow() < 1) {
      sheet.appendRow(headers);
    }
    sheet.insertRowBefore(2);
    sheet.getRange(2, 1, 1, rowData.length).setValues([rowData]);
  }

  return { success: true, message: "រក្សាទុកទិន្នន័យបានជោគជ័យ!" };
}

// មុខងារលុបទិន្នន័យចេញពី Sheet តាម ID
function deleteRecord(id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return { success: false, message: "រកមិនឃើញ Sheet ទេ!" };

  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return { success: false, message: "គ្មានទិន្នន័យសម្រាប់លុបទេ!" };

  const headers = rows[0];
  const idIndex = headers.indexOf('id');
  if (idIndex === -1) return { success: false, message: "រកមិនឃើញ Column ID ទេ!" };

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][idIndex] === id) {
      sheet.deleteRow(i + 1);
      return { success: true, message: "លុបទិន្នន័យបានជោគជ័យ!" };
    }
  }

  return { success: false, message: "រកមិនឃើញទិន្នន័យសម្រាប់លុបទេ!" };
}







// 🟢 ១. មុខងារពិនិត្យថ្ងៃផុតកំណត់ និងផ្ញើសារទៅ Telegram Group (សម្រាប់រត់ជាមួយ Time-driven Trigger)
function checkExpiryAndNotifyTelegram() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("Data"); // 👈 ផ្ទៀងផ្ទាត់ឈ្មោះ Tab ក្នុង Google Sheet របស់អ្នក
  
  if (!sheet) {
    Logger.log("រកមិនឃើញ Sheet ទេ!");
    return;
  }
  
  const dataRange = sheet.getDataRange();
  const data = dataRange.getValues();
  if (data.length <= 1) return;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // 📌 ផ្ទៀងផ្ទាត់លេខ Index Column (រាប់ចាប់ពី 0៖ Column A=0, B=1, C=2...)
  const incomingNoIndex = 1; // លេខចូល (Column A)
  const subjectIndex = 2;    // កម្មវត្ថុ (Column B)
  const statusIndex = 11;     // ស្ថានភាព (Column E)
  const expiryDateIndex = 19; // កាលបរិច្ឆេទផុតកំណត់ (Column H)
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const status = row[statusIndex];
    const expiryDateStr = row[expiryDateIndex];
    
    if (status === "បានបញ្ចប់" || !expiryDateStr) continue;
    
    const expiryDate = new Date(expiryDateStr);
    if (isNaN(expiryDate.getTime())) continue;
    
    expiryDate.setHours(0, 0, 0, 0);
    
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    // កំណត់ចំនួនថ្ងៃដែលត្រូវឱ្យវាផ្ញើសារ (ឧ. នៅសល់ ១ ឬ ២ថ្ងៃ ឬ ៣ថ្ងៃ)
    if (diffDays === 1 || diffDays === 2 || diffDays === 3) {
      const incomingNo = row[incomingNoIndex] ? String(row[incomingNoIndex]).trim() : "អត់មានលេខ";
      const subject = row[subjectIndex] ? String(row[subjectIndex]).trim() : "អត់មានកម្មវត្ថុ";
      
      const message = `⚠️ <b>ជូនដំណឹង៖ ឯកសារជិតផុតកំណត់!</b>\n\n` +
                      `📁 លេខចូល៖ <b>${incomingNo}</b>\n` +
                      `📝 កម្មវត្ថុ៖ ${subject}\n` +
                      `⏳ នៅសល់ <b>${diffDays} ថ្ងៃទៀត</b> នឹងដល់កាលបរិច្ឆេទផុតកំណត់ (${expiryDateStr})។`;
      
      sendTelegramMessage(message);
    }
  }
}

// មុខងារផ្ញើសារទៅ Telegram
function sendTelegramMessage(message) {
  const token = "8366150817:AAGmN1qvtsXr0rU3R0Jub2-c8-cW7Q-Ur0w";     
  const chatId = "-5311478885"; // ឧទាហរណ៍: "-100123456789"
  
  if (!message || message.trim() === "") return;
  
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  
  const payload = {
    chat_id: chatId,
    text: message,
    parse_mode: "HTML"
  };
  
  const options = {
    method: "post",
    contentType: "application/json",
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    Logger.log("លទ្ធផលពី Telegram: " + response.getContentText());
  } catch (e) {
    Logger.log("Error: " + e.message);
  }
}


// មុខងារចុះឈ្មោះគណនីថ្មី
function registerUser(username, password) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Users"); // ត្រូវបង្កើត Sheet ឈ្មោះ Users ជាមុនសិន
  
  if (!sheet) {
    sheet = ss.insertSheet("Users");
    sheet.appendRow(["Username", "Password", "CreatedDate"]);
  }
  
  var data = sheet.getDataRange().getValues();
  
  // ពិនិត្យមើលថាតើ Username មានរួចហើយ ឬនៅ
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === username) {
      return { success: false, message: "ឈ្មោះអ្នកប្រើប្រាស់នេះមានរួចហើយ សូមជ្រើសរើសឈ្មោះផ្សេង!" };
    }
  }
  
  // បញ្ចូលគណនីថ្មីចូលក្នុង Sheet Users
  sheet.appendRow([username, password, new Date()]);
  return { success: true, message: "ចុះឈ្មោះជោគជ័យ! សូមធ្វើការ Login ចូលម្តងទៀត។" };
}

// មុខងារផ្ទៀងផ្ទាត់ការ Login
function verifyLogin(username, password) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Users");
  
  if (!sheet) {
    return { success: false, message: "មិនទាន់មានទិន្នន័យគណនីនៅក្នុងប្រព័ន្ធទេ។" };
  }
  
  var data = sheet.getDataRange().getValues();
  
  // ផ្ទៀងផ្ទាត់ទិន្នន័យចាប់ពីជួរទី ២ (រំលង Header ជួរទី ១)
  for (var i = 1; i < data.length; i++) {
    var sheetUser = String(data[i][0]).trim(); // Column A (Username)
    var sheetPass = String(data[i][1]).trim(); // Column B (Password)
    
    if (sheetUser === username.trim() && sheetPass === password.trim()) {
      return { success: true, username: username };
    }
  }
  
  return { success: false, message: "ឈ្មោះអ្នកប្រើប្រាស់ ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ!" };
}


// មុខងារពិនិត្យមើលថាតើឯកសារនៅមានក្នុង Google Drive ដែរឬទែ តាមរយៈ URL
function checkFileExistsInDrive(fileUrl) {
  try {
    // ទាញយក File ID ពី URL
    let fileId = "";
    if (fileUrl.includes("id=")) {
      fileId = fileUrl.split("id=")[1].split("&")[0];
    } else if (fileUrl.includes("/d/")) {
      fileId = fileUrl.split("/d/")[1].split("/")[0];
    }

    if (!fileId) return false;

    // ព្យាយាមទាញយក File Metadata 
    const file = DriveApp.getFileById(fileId);
    // បើគ្មាន Error កើតឡើង មានន័យថាឯកសារនៅមាន
    return true;
  } catch (e) {
    // ប្រសិនបើរកមិនឃើញឯកសារ (Trash ឬ Delete ស្រេចបាច់) វាจะធ្លាក់មកទីនេះ
    return false;
  }
}

// មុខងារទាញទិន្នន័យពី Sheet (លឿន និងមិនរាំងស្ទះ)
function getRecords() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return [];

  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  const headers = rows[0];
  const records = [];
  const tz = Session.getScriptTimeZone();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const hasData = row.some(cell => cell !== "" && cell !== null && cell !== undefined);
    if (!hasData) continue;

    let obj = {};
    for (let j = 0; j < headers.length; j++) {
      let val = row[j];
      
      if (val instanceof Date) {
        if (headers[j] === 'timeIn' || headers[j] === 'timeOut') {
          val = Utilities.formatDate(val, tz, "HH:mm");
        } else {
          val = Utilities.formatDate(val, tz, "yyyy-MM-dd");
        }
      } else if (val === null || val === undefined) {
        val = "";
      }
      
      obj[headers[j]] = val;
    }
    records.push(obj);
  }
  return records;
}


// មុខងារពិនិត្យ និងចម្រាញ់យកតែឯកសារណាដែលនៅមាន និងមិនទាន់ត្រូវបានលុបចូល Trash
// មុខងារពិនិត្យ និងចម្រាញ់យកតែឯកសារណាដែលនៅមាន (មិនស្ថិតក្នុង Trash)
function getCheckedFilesData(filesDataJson) {
  if (!filesDataJson) return "";
  
  let fileArray = [];
  try {
    fileArray = JSON.parse(filesDataJson);
  } catch (e) {
    fileArray = [{ name: 'ឯកសារភ្ជាប់', url: filesDataJson }];
  }

  if (!Array.isArray(fileArray)) return "";

  let validFiles = [];
  for (let f of fileArray) {
    if (f.url && f.url.includes('drive.google.com')) {
      let fileId = "";
      if (f.url.includes("id=")) {
        fileId = f.url.split("id=")[1].split("&")[0];
      } else if (f.url.includes("/d/")) {
        fileId = f.url.split("/d/")[1].split("/")[0];
      }

      if (fileId) {
        try {
          // បើឯកសារស្ថិតក្នុង Trash ឬត្រូវបានលុប DriveApp.getFileById នឹង Throw Error ភ្លាម
          DriveApp.getFileById(fileId);
          validFiles.push(f); 
        } catch (e) {
          // ឯកសារត្រូវបានលុបចូល Trash ដូច្នេះមិនទាញយកមកបង្ហាញឡើយ
        }
      }
    } else if (f.url) {
      validFiles.push(f);
    }
  }

  return validFiles.length > 0 ? JSON.stringify(validFiles) : "";
}

// មុខងារពិនិត្យឯកសារដាច់ដោយឡែក
function checkFileExistsInDrive(fileUrl) {
  try {
    let fileId = "";
    if (fileUrl.includes("id=")) {
      fileId = fileUrl.split("id=")[1].split("&")[0];
    } else if (fileUrl.includes("/d/")) {
      fileId = fileUrl.split("/d/")[1].split("/")[0];
    }

    if (!fileId) return false;

    // បើឯកសារស្ថិតក្នុង Trash ឬត្រូវបានលុប វានឹង טעות (Throw error)
    DriveApp.getFileById(fileId);
    return true;
  } catch (e) {
    return false; // ឯកសារត្រូវបានលុប ឬស្ថិតក្នុង Trash
  }
}


// មុខងារលុបឯកសារជាក់លាក់ចេញពី Google Drive តាមរយៈ URL ឬ File ID
function deleteFileFromDrive(fileUrl) {
  try {
    if (!fileUrl) return { success: false, message: "មិនមានតំណភ្ជាប់ឯកសារទេ!" };
    
    let fileId = "";
    if (fileUrl.includes("id=")) {
      fileId = fileUrl.split("id=")[1].split("&")[0];
    } else if (fileUrl.includes("/d/")) {
      fileId = fileUrl.split("/d/")[1].split("/")[0];
    }

    if (!fileId) {
      return { success: false, message: "រកមិនឃើញ File ID សម្រាប់លុបទេ!" };
    }

    const file = DriveApp.getFileById(fileId);
    file.setTrashed(true); // បញ្ជូនចូល Trash ក្នុង Google Drive
    
    return { success: true, message: "បានលុបឯកសារចេញពី Folder ជោគជ័យ!" };
  } catch (error) {
    return { success: false, message: "កំហុសពេលលុបឯកសារ៖ " + error.message };
  }
}

// មុខងារពិនិត្យ និងសម្អាតឯកសារដែលស្ថិតក្នុង Trash (ហើយកត់ត្រាទុកក្នុង Sheet វិញបើមានការលុប)
function cleanAndCheckFiles(records) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return records;
  
  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return records;
  
  const headers = rows[0];
  const imageInIdx = headers.indexOf('imageIn');
  const imageOutIdx = headers.indexOf('imageOut');
  const idIdx = headers.indexOf('id');

  for (let i = 0; i < records.length; i++) {
    let rec = records[i];
    let rowNum = -1;

    // ពិនិត្យ imageIn
    if (rec.imageIn) {
      let checkedIn = getCheckedFilesDataOnly(rec.imageIn);
      if (checkedIn !== rec.imageIn) {
        rec.imageIn = checkedIn;
        rowNum = findRowIndexById(rows, idIdx, rec.id);
        if (rowNum > 0 && imageInIdx !== -1) {
          sheet.getRange(rowNum, imageInIdx + 1).setValue(checkedIn);
        }
      }
    }

    // ពិនិត្យ imageOut
    if (rec.imageOut) {
      let checkedOut = getCheckedFilesDataOnly(rec.imageOut);
      if (checkedOut !== rec.imageOut) {
        rec.imageOut = checkedOut;
        rowNum = rowNum > 0 ? rowNum : findRowIndexById(rows, idIdx, rec.id);
        if (rowNum > 0 && imageOutIdx !== -1) {
          sheet.getRange(rowNum, imageOutIdx + 1).setValue(checkedOut);
        }
      }
    }
  }
  return records;
}

function findRowIndexById(rows, idIdx, id) {
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][idIdx] === id) return i + 1;
  }
  return -1;
}

function findRowIndexById(rows, idIdx, id) {
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][idIdx] === id) return i + 1;
  }
  return -1;
}

// មុខងារត្រងយកតែឯកសារដែលមិនទាន់ស្ថិតក្នុង Trash
function getCheckedFilesDataOnly(filesDataJson) {
  if (!filesDataJson) return "";
  let fileArray = [];
  try {
    fileArray = JSON.parse(filesDataJson);
  } catch (e) {
    fileArray = [{ name: 'ឯកសារភ្ជាប់', url: filesDataJson }];
  }

  if (!Array.isArray(fileArray)) return "";

  let validFiles = [];
  for (let f of fileArray) {
    if (f.url && f.url.includes('drive.google.com')) {
      let fileId = "";
      if (f.url.includes("id=")) {
        fileId = f.url.split("id=")[1].split("&")[0];
      } else if (f.url.includes("/d/")) {
        fileId = f.url.split("/d/")[1].split("/")[0];
      }

      if (fileId) {
        try {
          // ពិនិត្យមើលថាតើឯកសារស្ថិតក្នុង Trash ឬត្រូវបានលុប
          const file = DriveApp.getFileById(fileId);
          // បន្ថែមការឆែកស្ថានភាព Trash ផ្ទាល់
          if (!file.isTrashed()) {
            validFiles.push(f);
          }
        } catch (e) {
          // ឯកសារត្រូវបានលុប ឬស្ថិតក្នុង Trash ដូច្នេះមិនត្រូវទាញយកមកទេ
        }
      }
    } else if (f.url) {
      validFiles.push(f);
    }
  }

  return validFiles.length > 0 ? JSON.stringify(validFiles) : "";
}
// កែសម្រួល getRecords ឱ្យទាញទិន្នន័យមក រួចហៅ cleanAndCheckFiles ត្រួតពិនិត្យម្តង
function getRecords() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) return [];

  const rows = sheet.getDataRange().getValues();
  if (rows.length <= 1) return [];

  const headers = rows[0];
  const records = [];
  const tz = Session.getScriptTimeZone();

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const hasData = row.some(cell => cell !== "" && cell !== null && cell !== undefined);
    if (!hasData) continue;

    let obj = {};
    for (let j = 0; j < headers.length; j++) {
      let val = row[j];
      
      if (val instanceof Date) {
        if (headers[j] === 'timeIn' || headers[j] === 'timeOut') {
          val = Utilities.formatDate(val, tz, "HH:mm");
        } else {
          val = Utilities.formatDate(val, tz, "yyyy-MM-dd");
        }
      } else if (val === null || val === undefined) {
        val = "";
      }
      
      obj[headers[j]] = val;
    }
    records.push(obj);
  }

  // ធ្វើការសម្អាតឯកសារដែលស្ថិតក្នុង Trash ចោលស្វ័យប្រវត្តិ
  return cleanAndCheckFiles(records);
}



// មុខងារផ្ទៀងផ្ទាត់ការ Login និងកត់ត្រាចូល Sheet Record User
function verifyLogin(username, password) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName("Users");
  
  if (!sheet) {
    return { success: false, message: "មិនទាន់មានទិន្នន័យគណនីនៅក្នុងប្រព័ន្ធទេ។" };
  }
  
  var data = sheet.getDataRange().getValues();
  
  // ផ្ទៀងផ្ទាត់ទិន្នន័យចាប់ពីជួរទី ២ (រំលង Header ជួរទី ១)
  for (var i = 1; i < data.length; i++) {
    var sheetUser = String(data[i][0]).trim(); // Column A (Username)
    var sheetPass = String(data[i][1]).trim(); // Column B (Password)
    
    if (sheetUser === username.trim() && sheetPass === password.trim()) {
      // 🟢 កត់ត្រាប្រវត្តិការ Login ចូល Sheet "Record User"
      recordUserLogin(username);
      
      return { success: true, username: username };
    }
  }
  
  return { success: false, message: "ឈ្មោះអ្នកប្រើប្រាស់ ឬពាក្យសម្ងាត់មិនត្រឹមត្រូវ!" };
}

// មុខងារសម្រាប់កត់ត្រា User និងម៉ោង Login ចូល Sheet "Record User"
function recordUserLogin(username) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var recordSheet = ss.getSheetByName("Record User");
  
  // ប្រសិនបើមិនទាន់មាន Sheet "Record User" ទេ ត្រូវបង្កើតវាថ្មី និងដាក់ Header
  if (!recordSheet) {
    recordSheet = ss.insertSheet("Record User");
    recordSheet.appendRow(["ឈ្មោះអ្នកប្រើប្រាស់ (Username)", "កាលបរិច្ឆេទ និងម៉ោងចូល (Login Time)"]);
  }
  
  var tz = Session.getScriptTimeZone();
  var loginTime = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd HH:mm:ss");
  
  // បញ្ចូលទិន្នន័យថ្មី (Username និង ម៉ោង) ទៅជួរខាងក្រោមគេ
  recordSheet.appendRow([username, loginTime]);
}
