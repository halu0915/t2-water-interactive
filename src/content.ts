export const equipment = [
  { id: 'tank', name: '儲熱桶', match: /Concept_Pressurized_Storage_Tank/, position: [-2.4, 1.45, -8], function: '儲存熱水並緩衝用水需求。下層補入冷水，上層供應熱水。', logic: '承壓儲熱桶承接共同冷水供應的基礎壓力；加熱與儲熱本身不是另一台串聯增壓泵。', status: '儲熱待命' },
  { id: 'cold-pump', name: '冷水恆壓泵', match: /Concept_Cold_Constant_Pressure_Pump/, position: [-3, .65, -4.2], function: '提供共同供水壓力，分流至冷水末端及儲熱桶補水端。', logic: '冷、熱水來自共同冷水源；末端可用壓力仍受高差、管損與流量影響。', status: '供水保壓' },
  { id: 'return-pump', name: '回水泵', match: /Concept_Return_Circulation_Pump/, position: [-1.1, .72, -5.25], function: '在封閉熱水迴路中建立循環壓差，使降溫的水回到儲熱桶。', logic: '循環壓差用來克服迴路阻力，不能把回水泵揚程直接加在所有末端的共同供水壓力上。', status: '依溫控啟停' },
  { id: 'mixing-valve', name: '恆溫混合閥', match: /Thermostatic_Mixing/, position: [-.8, 2.55, -8], function: '混合冷水與熱水以調節出水溫度。此閥為補充教學幾何，非圖面已確認設備。', logic: '實際混水穩定性需檢核冷熱入口壓力、流量與閥件規格；本頁不模擬防燙性能。', status: '混水概念' },
  ...[1, 2, 3].map((n, i) => ({ id: `balance-${n}`, name: `平衡閥 ${n}・${['近端', '中段', '遠端'][i]}`, match: new RegExp(`Balancing_Valve_${n}$`), position: [2.8, 2.15, [-9.5, -5.9, -2][i]], function: '調整支路阻力，避免低阻力近端搶走過多循環流量。', logic: '近端適度節流、遠端保留設計流量；滑桿為無因次示意，實際設定需量測與水力計算。', status: '手動平衡' })),
  { id: 'sensor', name: '溫度感測點', match: /Return_Temperature_Sensor/, position: [-.25, .82, -5.25], function: '量測回水代表溫度，作為循環泵啟停的示範控制輸入。', logic: '低於或等於啟動值時開泵；高於或等於停止值時關泵；中間遲滯區保留前一狀態。', status: '手動溫度輸入' },
  { id: 'far-end', name: '最不利末端', match: /W2_basin_marker\.002$/, position: [3.6, .55, -3.8], function: '示範需優先檢核的末端供水與等待熱水問題。選用現有衛浴節點作教學錨點。', logic: '幾何最遠不必然水力最不利；實際位置須比較管長、管徑、高差、局部阻力與同時用水量。', status: '概念檢核點' },
];
export const modeNotes = {
  待機: '無末端需求，回水泵停機。管線保留作為系統背景。',
  末端用水: '共同冷水供應分流；熱水由儲熱桶送往末端，回水泵停機。',
  回水循環: '無末端取水；回水泵依溫控啟停，熱水與回水形成循環。',
  同時用水: '末端取水與溫控循環並行；共同供水壓力與循環壓差各有作用。',
};
