# UAV Command Center 🚁

這是一個基於 React (Vite) 與 Python (FastAPI) 所開發的無人載具即時監控儀表板。它能接收來自 Mission Planner 轉送出來的 MAVLink 遙測封包，將姿態 (HUD)、地圖位置 (Leaflet) 等資訊透過 WebSocket 即時呈現於具有科技 Cyberpunk 風格的前端介面上，並將這些記錄存入 MySQL 資料庫中。

## 目錄
- [專案結構](#專案結構)
- [環境需求](#環境需求)
- [資料庫設定 (MySQL)](#資料庫設定-mysql)
- [後端設定 (FastAPI)](#後端設定-fastapi)
- [前端設定 (React + Vite)](#前端設定-react--vite)
- [如何進行 MAVLink 串接與測試](#如何進行-mavlink-串接與測試)

---

## 專案結構
```text
new_ship/
├── .env                # 環境變數設定檔 (資料庫與 MAVLink Port)
├── schema.sql          # MySQL 資料庫建表語法
├── getMAVLink.py       # 後端核心程式 (FastAPI + Pymavlink)
├── simulator.py        # MAVLink 模擬器 (未連結無人機時可產生測試假資料)
└── frontend/           # 前端 React 專案目錄
    ├── src/
    │   ├── App.jsx     # 主畫面與 WebSockets 管理
    │   └── components/ # HUD、地圖、數據表等 UI 組件
    └── package.json
```

---

## 環境需求
在開始之前，請確保您的主機已經安裝：
- **Python** (建議 >= 3.10)
- **Node.js** (建議 >= 18.x)
- **MySQL Server** (建議 >= 8.x)

---

## 資料庫設定 (MySQL)

1. 確認 MySQL 服務已在背景啟動。
2. 開啟您的 MySQL 客戶端工具 (如：MySQL Workbench, DBeaver, 或終端機的 `mysql -u root -p`)。
3. 執行根目錄下 `schema.sql` 裡的所有 SQL 語句。
   ```sql
   -- 這將會自動建立 mavlink_db 資料庫以及 telemetry_logs 資料表
   source /絕對路徑/new_ship/schema.sql;
   ```
4. 如果您的 MySQL 密碼不是預設設定，請打開檔案 `.env` 並修改帳號與密碼：
   ```env
   DB_HOST=127.0.0.1
   DB_PORT=3306
   DB_USER=root
   DB_PASSWORD=您的資料庫密碼
   DB_NAME=mavlink_db
   ```

---

## 後端設定 (FastAPI)

後端依賴 FastAPI 作為 Web Server，並使用 Pymavlink 即時解析 UDP 封包：

1. 開啟終端機並停留在專案根目錄 (包含 `getMAVLink.py` 的位置)。
2. 建議建立虛擬環境，接著安裝依賴套件：
   ```bash
   pip install fastapi uvicorn pymavlink aiomysql websockets python-dotenv
   ```
3. 啟動後端伺服器 (開發模式)：
   ```bash
   uvicorn getMAVLink:app --reload --port 8000
   ```
   > 預設背景下，FastAPI 將同時開啟 API (`http://localhost:8000/api/logs`) 與 WebSocket (`ws://localhost:8000/ws/telemetry`)，並持續監聽 `14551` UDP 埠。

---

## 前端設定 (React + Vite)

前端採用現代 Vite 構建，具備即時熱更新：

1. 開啟另一個終端機，進入 frontend 目錄：
   ```bash
   cd frontend
   ```
2. 安裝所有 Node 套件：
   ```bash
   npm install
   ```
3. 啟動前端開發伺服器：
   ```bash
   npm run dev
   ```
   > 啟動完成後，終端機將顯示訪問網址（預設為 `http://localhost:5173/`）。

---

## 如何進行 MAVLink 串接與測試

### 方案 A：使用 Mission Planner (真實/SITL)
1. 在連上無人機（或 SITL 模擬器）的 **Mission Planner** 中，進入 **Ctrl + F** (隱藏選單)。
2. 點擊 **"MAVLink"** 按鈕。
3. 選擇 **UDP Host** 輸出，設定 IP 為本機運行後端的 IP (`127.0.0.1`)，Port 若未更改應填寫 `.env` 內定義的通訊埠（預設 `14551`）。
4. 點選 Connect，資料便會開始轉發至我們的 FastAPI 後端，頁面上的儀表便會即時更新。

### 方案 B：使用本地模擬器 (`simulator.py`)
如果您暫時沒有 Mission Planner 或無人機環境，您可以使用附帶的模擬器腳本注入虛擬參數：
1. 確保 FastAPI 後端 (`getMAVLink.py`) 已經啟動。
2. 確保前端 React 已經載入，並開啟網頁。
3. 開啟終端機執行模擬腳本：
   ```bash
   python simulator.py
   ```
4. 您將會在前端網頁中看見姿態儀 (HUD) 不斷轉動、地圖軌跡繪製中，並在歷史資料庫記錄表中看見源源不絕的 Telemetry Logs 資料！

---

## 常見問題與錯誤排除 (Troubleshooting)

### 1. 啟動後端時出現 `uvicorn : 無法辨識 'uvicorn' 詞彙`
**原因**：Python 的 Scripts 資料夾未加入系統 環境變數 (PATH)。
**解法**：請改用 Python 的 `m` 參數指定模組執行即可：
```bash
python -m uvicorn getMAVLink:app --reload --port 8000
```

### 2. 啟動前端時出現 `npm : 因為這個系統上已停用指令碼執行` (PSSecurityException)
**原因**：Windows PowerShell 預設安全原則阻擋 `.ps1` 腳本執行。
**解法**：在 PowerShell 中執行以下指令來解除當前使用者的執行限制：
```powershell
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
```
(如果您不想更改原則，可以透過加上 `cmd /c` 前綴來啟動：`cmd /c "npm run dev"`)

### 3. 後端報錯 `Table 'mavlink_db.telemetry_logs' doesn't exist`
**原因**：雖然 MySQL 連線成功，但未建立對應的資料表，導致寫入失敗。
**解法**：請開啟 MySQL 操作介面，並確保已經完整執行了根目錄下的 `schema.sql` 來建立資料表。
