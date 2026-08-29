// State.js — 共享狀態與 DOM 參照（無任何依賴，需最先載入）

const uploadArea = document.getElementById("uploadArea");
const fileInput = document.getElementById("fileInput");
const imagesContainer = document.getElementById("imagesContainer");
const previewContainer = document.getElementById("previewContainer");
const downloadAllBtn = document.getElementById("downloadAllBtn");
let editedImages = [];          // { dataURL, filename }[]