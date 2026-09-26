# 驗證紀錄

日期：2026-09-26。**PASS：安裝、單元測試、GLB 解析、桌機／手機 WebGL E2E 與正式建置均已完成。**

## 已實際執行

| 項目 | 結果與證據 |
| --- | --- |
| `npm install --no-audit --no-fund` | 通過；新增 39 個套件並產生 `package-lock.json`。 |
| `npm run build` | 通過。TypeScript strict 無型別錯誤；Vite production build 產生 `dist` 與同源 GLB。 |
| `npm test` | 通過；Vitest **10/10**。涵蓋回差邊界、雙向歷史、模式路線、非法門檻、圖層及支路平衡。 |
| `npm run test:smoke` | 通過。直接執行實際 `state.ts` 並以 Three.js 解析真實 GLB。 |
| 真實 GLB 解析 | 通過；`GLTFLoader.parseAsync` 確認 **80 個 mesh**，設備包圍盒中心均為有效座標。 |
| 設備 metadata 比對 | 通過。8 個設備／教學錨點綁定現有模型；1 個恆溫混合閥明確採程序化示意。修正 loader 移除名稱句點造成的末端匹配問題，改用原始 `userData.name`。 |
| `npm run test:e2e` | 通過；Playwright **10/10**，桌機 1440×1000 與手機 390×844 各 5 案例。 |
| `node scripts/webkit-smoke.mjs` | 通過；Playwright WebKit 26.4 載入 81 個節點，四視角與四模式可操作，無 page／console error。此項不等同實體 Safari 驗證。 |
| 視覺、WebGL、觸控檢查 | 通過。實際載入 81 個節點、操作四視角、六圖層、播放／暫停、四模式、設備點選、錯誤回復與重設；無 page error、無外部請求、無水平溢位，可見控制高度均至少 44px。 |
| 截圖 | `evidence/layout-desktop.png`、`evidence/layout-mobile.png`；人工檢視無重疊、文字破版或模型載入失敗。 |
| 操作錄影 | `evidence/T2-water-interactive-demo.mp4`；H.264、1440×900、12.52 秒，抽幀確認非黑畫面且為本網站操作。 |

驗證時使用 TypeScript 5.9.3、Vite 7.3.6、Three.js 0.180.0、Vitest 5.0.2、Playwright 1.59.1。版本固定於 `package.json` 與 `package-lock.json`；`npm audit` 實測為 **0 vulnerabilities**。

建置有 Three.js vendor chunk 大於 Vite 500kB 預設提示門檻的非致命警告，約 608kB 原始／155kB gzip；應用程式另分一個小 chunk。GLB 約 743KiB。所有執行階段依賴均打包，沒有 CDN 請求。

## 自動化案例範圍

Vitest 10 案例：門檻含等號、遲滯雙歷史、非法輸入、完整溫度循環、離開／重入模式、修改門檻立即重算、四模式路線、圖層獨立、支路節流、獨立重設初始值。

Playwright 每一尺寸 5 案例：

1. 真實 GLB loaded、四視角、六圖層、播放／暫停／速度、無外部請求及無 page error。
2. 溫控歷史、非法門檻、四模式、平衡滑桿鍵盤輸入、說明視窗與完整重設。
3. 以真實螢幕座標點選 3D 儲熱桶熱點，再檢查全部設備內容及補充模型標示。
4. 1440×1000／390×844 無水平溢位、可見控制高度至少 44px，並保存全頁截圖。
5. 阻斷 GLB 請求時出現可操作錯誤與重新載入按鈕。

補充 smoke script 不建立 WebGLRenderer，**不證明 GPU 繪製、OrbitControls 或視覺配置正確**；它僅補足可在受限環境執行的狀態及模型資料驗證。

## 驗收結論

- 桌機與手機 WebGL 互動、錯誤狀態及視覺截圖：**PASS**。
- 單元測試、真實 GLB 解析、隱私／外部請求檢查、正式建置：**PASS**。
- Playwright WebKit 引擎：**PASS**；實體 Safari 與實體手機觸控本次未宣稱，正式上線前仍建議補做真機 smoke test。
