# T2 水的路徑

以 Vite、TypeScript 與 Three.js 建立的繁體中文冷熱水系統互動教學。使用專案內原有 `public/models/t2-water-system.glb`，不依賴 CDN、外部 API、字型服務、追蹤程式或憑證。

## 本機使用

Node.js 22.12 以上：

```sh
npm install
npm run dev
```

開啟終端顯示的本機網址。正式建置及預覽：

```sh
npm run build
npm run preview
```

部署產物為 `dist/`，包含 GLB 與打包後的所有執行階段相依套件。必須透過 HTTP 提供，不能直接雙擊 HTML。設定 `base: './'`，可在靜態網站子目錄使用。本次沒有部署或對外傳送資料。

## 互動內容

- 真正 WebGL 模型、OrbitControls 旋轉／平移／縮放，以及全景、設備間、衛浴區、最遠端四個視角。
- 建築、冷水、熱水、回水、設備、標籤六個獨立圖層；標籤預設關閉。
- 四種模式決定啟用路線；未啟用管線淡化，活動路線顯示藍／紅／橘粒子。暫停、速度與重設不改變溫控輸入。
- 9 個可點選的 3D 熱點與等效設備選單，含三支獨立平衡閥。以透明球形碰撞區擴大至約 44px 直徑；小圓環指示中心。
- 可調啟動／停止門檻與回水溫度；預設 45／50°C、目前 47°C。遲滯帶保留前一泵狀態。
- 三支路開度與相對設計流量指標，說明近端節流、遠端保留流量。
- 手機版、鍵盤操作、說明對話框、載入／錯誤／重試及完整重設。尊重減少動態效果設定，初始暫停動畫。

## 控制邏輯

| 模式 | 冷水需求 | 熱水路線 | 回水泵 |
| --- | --- | --- | --- |
| 待機 | 無 | 背景 | 強制停止 |
| 末端用水 | 有 | 供水 | 強制停止 |
| 回水循環 | 無 | 泵啟動時循環 | 依遲滯控制 |
| 同時用水 | 有 | 供水，並可循環 | 依遲滯控制 |

循環允許時：`T <= start` 啟動，`T >= stop` 停止，`start < T < stop` 保持先前狀態。離開循環模式會停止泵；在帶內重新啟用時從停止狀態保持停止。門檻修改立即重新判斷；拒絕非數字與 `start >= stop`。時間、FPS、動畫速度皆不影響泵狀態。

平衡指標為 `round(開度 / 相對阻力係數)`，近／中／遠分別使用 0.45／0.65／1；45／65／100% 開度產生 100% 教學流量指標。係數僅為無因次示例，非實際閥特性、設計開度或耦合水力解算。關閉回水平衡閥不會關掉有末端需求的熱水粒子。

**共同冷水供應壓力與回水循環壓差不能直接相加作為末端壓力。** 回水泵用來克服迴路阻力；實際末端壓力仍需計算高差、管損與流量。

## 模型依據與界限

原始 GLB 含 80 個 mesh，metadata 包含 `conceptual_not_to_scale`、`construction_use: false` 與 `schematic`。程式優先利用 `userData.name`（原始 glTF 名稱），其次使用 Three.js 節點名，計算世界座標包圍盒中心綁定熱點。Three.js 會移除名稱中的句點，使用原始 metadata 可正確辨識 `W2_basin_marker.002`。

- 儲熱桶、冷水恆壓泵、回水泵、三支平衡閥與感測點：綁定對應 GLB 物件。
- 恆溫混合閥：原模型沒有對應節點，補充黃銅色教學幾何與明確示意說明；不宣稱實際配管已接入混合閥。
- 最不利末端：使用既有衛浴節點作概念錨點，**不代表已證明該點為水力最不利點**。
- 相機視角為教學取景，設備間名稱不代表實際房間界線。流動折線配合概念模型手動設定，非測量中心線；粒子方向、速度、尺寸與儲熱分層皆非 CFD 或現場量測。

## 測試

```sh
npm test                     # 10 個 Vitest 邏輯案例
npm run test:smoke           # Node 狀態／實際 GLB 解析補充檢查
npx playwright install chromium
npm run test:e2e             # 5 個情境 × 桌機／手機，共 10 個案例
npm run build               # TypeScript strict + Vite production build
```

本次實際執行結果請見 [VALIDATION.md](VALIDATION.md)，操作與問題排除見 [OPERATIONS.md](OPERATIONS.md)。桌機與手機 Chromium E2E、Playwright WebKit 引擎 smoke 均已通過；實體 Safari 與實體手機仍屬上線前 smoke test 範圍。操作錄影位於 `evidence/T2-water-interactive-demo.mp4`。

## 除錯介面

`window.__T2_DEBUG__` 提供唯讀快照 getter：`loaded`、`currentMode`、`layers`、`animationPlaying`、`speed`、`pumpState`、`temps`、`balances`、`selectedEquipment`、`modelNodes`，另有 `camera` 與動畫 `phase`。`modelNodes` 包含 loader 節點名、圖層與原始 metadata。

```js
window.__T2_DEBUG__.setCamera('設備間')
window.__T2_DEBUG__.setMode('回水循環')
window.__T2_DEBUG__.projectEquipment('tank') // 螢幕座標，供真實點選測試
window.__T2_DEBUG__.reset()
```

## 程式結構

`src/state.ts` 為純狀態邏輯；`content.ts` 管理設備知識與錨點；`scene.ts` 負責模型、相機、粒子與 picking；`main.ts` 管理 UI 事件；`style.css` 提供紙感米色版面。沒有伺服器端資料庫、環境變數或持久化個資。
