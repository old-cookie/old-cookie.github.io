// Shared XLSX parser for Soup (used by soup.js and soupDetail.js)
function parseXLSX(xlsxBuffer) {
  try {
    const workbook = XLSX.read(xlsxBuffer, { type: "array" });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
    if (jsonData.length === 0) return [];
    const headers = jsonData[0];
    const rows = [];
    for (let i = 1; i < jsonData.length; i++) {
      const values = jsonData[i];
      if (values.some((val) => val !== "")) {
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || "";
        });
        rows.push(row);
      }
    }
    return rows;
  } catch (error) {
    console.error("解析 XLSX 時發生錯誤:", error);
    return [];
  }
}

function convertXLSXToSoupData(xlsxData) {
  const soupData = {};
  xlsxData.forEach((row) => {
    const title = row["湯名"];
    if (!title) return;
    const isAI = row["AI 生成?"] === "是";
    const safeString = (value) => (value === null || value === undefined ? "" : String(value));
    soupData[title] = {
      類型: safeString(row["類型"]),
      規則: safeString(row["規則"]),
      主持人手冊: safeString(row["主持人手冊"]),
      湯面: safeString(row["湯面"]),
      湯底: safeString(row["湯底"]),
      其他資料: safeString(row["其他資料"]),
      ai: isAI,
    };
  });
  return soupData;
}
