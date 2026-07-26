// State.js — 共享狀態與 DOM 參照（無任何依賴，需最先載入）

const uploadArea = document.getElementById("uploadArea");
const fileInput = document.getElementById("fileInput");
const imagesContainer = document.getElementById("imagesContainer");
const previewSection = document.getElementById("previewSection");
const previewContainer = document.getElementById("previewContainer");
const downloadAllBtn = document.getElementById("downloadAllBtn");
const processBtn = document.getElementById("processBtn");

let cropperInstances = [];          // CropperV2 實例陣列，依上傳順序排列
let cropperMap = new Map();   // imgWrapper → CropperV2 實例
let editedImages = [];          // { dataURL, filename }[]
let resizeObserver;
let suppressSelectionBoundaryCheck = false;
