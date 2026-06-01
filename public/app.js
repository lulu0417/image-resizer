const dropZone = document.getElementById("dropZone");
const fileInput = document.getElementById("fileInput");
const fileList = document.getElementById("fileList");
const previewBtn = document.getElementById("previewBtn");
const previewSection = document.getElementById("previewSection");
const previewGrid = document.getElementById("previewGrid");
const downloadAllBtn = document.getElementById("downloadAllBtn");
const toast = document.getElementById("toast");

let selectedFiles = [];
let processedImages = [];

dropZone.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", (e) => addFiles(e.target.files));

dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    dropZone.classList.add("drag-over");
});
dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drag-over"));
dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    dropZone.classList.remove("drag-over");
    addFiles(e.dataTransfer.files);
});

function addFiles(files) {
    for (const f of files) {
        if (f.type.startsWith("image/")) {
            selectedFiles.push(f);
        }
    }
    renderFileList();
    previewBtn.disabled = selectedFiles.length === 0;
}

function renderFileList() {
    fileList.innerHTML = selectedFiles.map((f, i) =>
        `<span class="file-tag">${f.name}<span class="remove" data-idx="${i}">&times;</span></span>`
    ).join("");
    fileList.querySelectorAll(".remove").forEach((el) => {
        el.addEventListener("click", () => {
            selectedFiles.splice(+el.dataset.idx, 1);
            renderFileList();
            previewBtn.disabled = selectedFiles.length === 0;
        });
    });
}

function readFileAsDataURL(file) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
    });
}

function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
    });
}

function processImage(img, targetW, targetH, mode, format) {
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");

    if (mode === "fit") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, targetW, targetH);
        const scale = Math.min(targetW / img.width, targetH / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (targetW - w) / 2;
        const y = (targetH - h) / 2;
        ctx.drawImage(img, x, y, w, h);
    } else {
        ctx.drawImage(img, 0, 0, targetW, targetH);
    }

    const mimeType = format === "original" ? "image/png" : `image/${format}`;
    const quality = format === "jpeg" ? 0.92 : undefined;
    return canvas.toDataURL(mimeType, quality);
}

function getOutputFilename(originalName, format) {
    const base = originalName.replace(/\.[^.]+$/, "");
    if (format === "original") {
        const ext = originalName.match(/\.([^.]+)$/);
        return ext ? `${base}_resized.${ext[1]}` : `${base}_resized.png`;
    }
    const extMap = { png: "png", jpeg: "jpg", webp: "webp" };
    return `${base}_resized.${extMap[format] || "png"}`;
}

previewBtn.addEventListener("click", async () => {
    const targetW = parseInt(document.getElementById("width").value);
    const targetH = parseInt(document.getElementById("height").value);
    const mode = document.getElementById("mode").value;
    const format = document.getElementById("format").value;

    if (!targetW || !targetH || targetW < 1 || targetH < 1) {
        showToast("请输入有效的宽度和高度");
        return;
    }

    previewBtn.innerHTML = '<span class="spinner"></span>处理中...';
    previewBtn.disabled = true;
    processedImages = [];
    previewGrid.innerHTML = "";

    for (const file of selectedFiles) {
        const dataUrl = await readFileAsDataURL(file);
        const img = await loadImage(dataUrl);
        const resultDataUrl = processImage(img, targetW, targetH, mode, format);
        const filename = getOutputFilename(file.name, format);

        processedImages.push({ filename, dataUrl: resultDataUrl });

        const card = document.createElement("div");
        card.className = "preview-card";
        card.innerHTML = `
            <div class="compare">
                <div><div class="label">原图 (${img.width}x${img.height})</div><img src="${dataUrl}"></div>
                <div><div class="label">处理后 (${targetW}x${targetH})</div><img src="${resultDataUrl}"></div>
            </div>
            <div class="info">
                <span>${filename}</span>
                <button class="btn-download" data-idx="${processedImages.length - 1}">下载</button>
            </div>`;
        previewGrid.appendChild(card);
        card.querySelector(".btn-download").addEventListener("click", (e) => {
            const idx = +e.target.dataset.idx;
            downloadFile(processedImages[idx].dataUrl, processedImages[idx].filename);
        });
    }

    previewSection.hidden = false;
    previewBtn.innerHTML = "预览处理效果";
    previewBtn.disabled = false;
    previewSection.scrollIntoView({ behavior: "smooth" });
});

function downloadFile(dataUrl, filename) {
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

downloadAllBtn.addEventListener("click", () => {
    if (processedImages.length === 0) {
        showToast("没有可下载的图片");
        return;
    }
    processedImages.forEach((img, i) => {
        setTimeout(() => downloadFile(img.dataUrl, img.filename), i * 200);
    });
    showToast(`正在下载 ${processedImages.length} 张图片`);
});

function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), 3000);
}
