# 收租計算機 (Google Sheets 雲端版)

這個專案使用 React + Tailwind CSS 開發，並採用 Google Sheets 當作免費、穩定且可永久保存的資料庫。透過 Google Apps Script 提供的 API 來讀取與寫入資料。

## 為什麼要用 Google Sheets？
因為原本資料存在手機瀏覽器的 LocalStorage，如果媽媽清除了瀏覽器快取、或是換了一支新手機，原本設定好的「固定租金、上期度數」都會全部消失。
改用 Google Sheets 後，不管是換手機、還是媽媽跟其他家人同時登入查看，資料都會同步且永遠都在。

---

## 步驟一：設定 Google Sheets 與 Apps Script (後端)

1. 開啟一個新的 [Google 試算表 (Google Sheets)](https://sheets.new/)。
2. 將左下角的第一張工作表 (通常預設叫 "工作表1") 重新命名為 `Rooms` **(注意大小寫)**。
3. 點擊頂部選單的「**擴充功能**」 -> 「**Apps Script**」。
4. 預設會開啟一個 `程式碼.gs` 的檔案，請**刪除裡面所有的程式碼**，貼上以下這段：

```javascript
const SHEET_ROOMS = 'Rooms'; 
const SHEET_HISTORY = 'History'; 

function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_ROOMS);
  const data = sheet.getDataRange().getValues();
  
  // 第一行為標題欄: [房號, 月租金, 每度電費, 上期電表度數]
  if (data.length <= 1) {
    return ContentService.createTextOutput(JSON.stringify({}))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const result = {};
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    result[row[0].toString()] = {
      rent: Number(row[1]),
      pricePerUnit: Number(row[2]),
      prevMeter: Number(row[3])
    };
  }
  
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const roomsSheet = ss.getSheetByName(SHEET_ROOMS);
  let historySheet = ss.getSheetByName(SHEET_HISTORY);
  
  // 如果沒有歷史紀錄的表，自動建立一個
  if (!historySheet) {
    historySheet = ss.insertSheet(SHEET_HISTORY);
    historySheet.appendRow(['時間', '房號', '上期度數', '本期度數']);
  }
  
  let parsedContent;
  try {
    parsedContent = JSON.parse(e.postData.contents);
  } catch(err) {
    // 為了相容原本的寫法
    parsedContent = { rooms: JSON.parse(e.postData.contents) }; 
  }

  // 1. 寫入最新的房間狀態
  const roomsData = parsedContent.rooms || parsedContent;
  roomsSheet.clear();
  roomsSheet.appendRow(['房號', '月租金', '每度電費', '上期電表度數']);
  
  Object.keys(roomsData).forEach(roomId => {
    const room = roomsData[roomId];
    roomsSheet.appendRow([roomId, room.rent, room.pricePerUnit, room.prevMeter]);
  });
  
  // 2. 如果收到結算紀錄 (log)，就把紀錄寫入 History 工作表
  if (parsedContent.log) {
    const log = parsedContent.log;
    historySheet.appendRow([log.timestamp, log.roomId, log.prevMeter, log.currentMeter]);
  }
  
  return ContentService.createTextOutput(JSON.stringify({status: 'success'}))
    .setMimeType(ContentService.MimeType.JSON);
}
```

5. 點擊右上角的藍色按鈕「**部署**」 -> 「**新增部署作業**」。
6. 點擊左邊齒輪圖示 ⚙️，選擇「**網頁應用程式**」。
7. 右側設定請按照以下填寫：
   - 說明：(隨便填，例如版本1)
   - 執行身分：**我 (你的 Email)**
   - 誰可以存取：**所有人** (這點非常重要，否則前端抓不到資料)
8. 點擊右下角的「**部署**」。
   - *(這時 Google 可能會跳出「需要授權」的安全警告，點擊「審查權限」 -> 選擇你的帳號 -> 點選左下角的「進階」 -> 「前往 不安全的項目」 -> 「允許 API 權限」)*
9. 授權完成後，你會看到一串很長的 **網頁應用程式 URL** (開頭為 `https://script.google.com/macros/s/..../exec`)。
10. **複製這個 URL**，然後貼到你專案原始碼 `src/App.jsx` 的第 3 行，替換掉 `SCRIPT_URL` 的值。

---

## 步驟二：部署網站到 Vercel (讓媽媽可以直接用網址開啟)

資料庫設定好後，我們需要把這個網站發布到網路上，最簡單免費的方式就是用 **Vercel**。

1. 確保你已經把開發好的專案程式碼推送到自己的 **GitHub Repository**。
2. 前往 [Vercel 官網 (vercel.com)](https://vercel.com/)，用你的 GitHub 帳號註冊/登入。
3. 登入後，點選畫面上的「**Add New...**」 -> 「**Project**」。
4. 找到你剛剛推上 Github 的那個「包租婆收租計算機」專案，點擊右邊的「**Import**」。
5. Vercel 會自動偵測到這是 Vite + React 的專案，什麼設定都不用改，直接點擊「**Deploy**」。
6. 等待大約 1 分鐘，部署完成後你就會得到一個專屬網址 (例如 `https://your-rent-app.vercel.app`)。

---

## 步驟三：安裝到媽媽手機桌面

1. 將 Vercel 產生的網址用 **LINE** 傳給媽媽。
2. 請媽媽在手機上點開連結 (建議點擊右上角「**使用預設瀏覽器開啟**」，例如 iPhone 用 Safari，Android 用 Chrome)。
3. 在瀏覽器底下的分享選單（或右上角的選單）找到「**加入主畫面**」。
4. 這樣這個 Web App 就會像一個真正的 App 一樣出現在她手機桌面上，點開就能直接用了！
