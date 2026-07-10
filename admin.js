const storageKey = "esupoNewsDraft";
const form = document.querySelector("#news-form");
const list = document.querySelector("#editor-news-list");
const status = document.querySelector("#admin-status");
const idInput = document.querySelector("#news-id");
const dateInput = document.querySelector("#news-date");
const titleInput = document.querySelector("#news-title");
const summaryInput = document.querySelector("#news-summary");
const imageInput = document.querySelector("#news-image");
const imageFileInput = document.querySelector("#news-image-file");
const altInput = document.querySelector("#news-alt");

const initialNews = structuredClone(Array.isArray(window.ESUPO_NEWS) ? window.ESUPO_NEWS : []);
let newsItems = loadDraft();

function loadDraft() {
  try {
    const saved = localStorage.getItem(storageKey);
    return saved ? JSON.parse(saved) : structuredClone(initialNews);
  } catch {
    return structuredClone(initialNews);
  }
}

function saveDraft(message = "ブラウザ内に保存しました。") {
  localStorage.setItem(storageKey, JSON.stringify(newsItems));
  status.textContent = message;
  renderList();
}

function slugify(value) {
  return value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 42);
}

function clearForm() {
  form.reset();
  idInput.value = "";
  dateInput.value = new Date().toISOString().slice(0, 10);
  status.textContent = "";
}

function imageFileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = reject;
    reader.onload = () => {
      const image = new Image();
      image.onerror = reject;
      image.onload = () => {
        const maxWidth = 1280;
        const scale = Math.min(1, maxWidth / image.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/webp", 0.82));
      };
      image.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const editingId = idInput.value;
  let image = imageInput.value.trim() || "assets/hero.png";

  if (imageFileInput.files[0]) {
    status.textContent = "画像を軽量化しています…";
    image = await imageFileToDataUrl(imageFileInput.files[0]);
  }

  const generatedId = `news-${dateInput.value}-${slugify(titleInput.value) || Date.now()}`;
  const item = {
    id: editingId || generatedId,
    date: dateInput.value,
    title: titleInput.value.trim(),
    summary: summaryInput.value.trim(),
    image,
    alt: altInput.value.trim(),
  };

  if (editingId) {
    newsItems = newsItems.map((news) => (news.id === editingId ? item : news));
  } else {
    newsItems.push(item);
  }

  clearForm();
  saveDraft(editingId ? "ニュースを更新しました。" : "ニュースを追加しました。");
});

function renderList() {
  list.replaceChildren();
  const sorted = [...newsItems].sort((a, b) => b.date.localeCompare(a.date));

  if (!sorted.length) {
    const empty = document.createElement("p");
    empty.textContent = "登録中のニュースはありません。";
    list.append(empty);
    return;
  }

  sorted.forEach((item) => {
    const row = document.createElement("article");
    row.className = "editor-news-item";
    const image = document.createElement("img");
    image.src = item.image || "assets/hero.png";
    image.alt = "";
    const copy = document.createElement("div");
    const time = document.createElement("time");
    time.textContent = item.date.replaceAll("-", ".");
    const title = document.createElement("h3");
    title.textContent = item.title;
    copy.append(time, title);
    const actions = document.createElement("div");
    actions.className = "editor-item-actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "✎";
    edit.title = "編集";
    edit.setAttribute("aria-label", `${item.title}を編集`);
    edit.addEventListener("click", () => editItem(item.id));
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "×";
    remove.title = "削除";
    remove.setAttribute("aria-label", `${item.title}を削除`);
    remove.addEventListener("click", () => deleteItem(item.id));
    actions.append(edit, remove);
    row.append(image, copy, actions);
    list.append(row);
  });
}

function editItem(id) {
  const item = newsItems.find((news) => news.id === id);
  if (!item) return;
  idInput.value = item.id;
  dateInput.value = item.date;
  titleInput.value = item.title;
  summaryInput.value = item.summary;
  imageInput.value = item.image.startsWith("data:") ? "" : item.image;
  altInput.value = item.alt || "";
  imageFileInput.value = "";
  window.scrollTo({ top: 0, behavior: "smooth" });
  status.textContent = "編集内容を読み込みました。";
}

function deleteItem(id) {
  const item = newsItems.find((news) => news.id === id);
  if (!item || !window.confirm(`「${item.title}」を削除しますか？`)) return;
  newsItems = newsItems.filter((news) => news.id !== id);
  saveDraft("ニュースを削除しました。");
}

document.querySelector("#cancel-edit").addEventListener("click", clearForm);

document.querySelector("#export-news").addEventListener("click", () => {
  const source = `window.ESUPO_NEWS = ${JSON.stringify(newsItems, null, 2)};\n`;
  const url = URL.createObjectURL(new Blob([source], { type: "text/javascript;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "news-data.js";
  anchor.click();
  URL.revokeObjectURL(url);
  status.textContent = "公開用の news-data.js を書き出しました。";
});

document.querySelector("#import-news").addEventListener("change", async (event) => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const source = await file.text();
    const json = source
      .replace(/^\s*window\.ESUPO_NEWS\s*=\s*/, "")
      .replace(/;\s*$/, "");
    const imported = JSON.parse(json);
    if (!Array.isArray(imported)) throw new Error("配列ではありません");
    newsItems = imported;
    saveDraft("ニュースファイルを読み込みました。");
  } catch {
    status.textContent = "ファイルを読み込めませんでした。news-data.js またはJSONを選んでください。";
  }
  event.target.value = "";
});

document.querySelector("#reset-news").addEventListener("click", () => {
  if (!window.confirm("ブラウザ内の編集内容をすべて初期状態に戻しますか？")) return;
  newsItems = structuredClone(initialNews);
  localStorage.removeItem(storageKey);
  clearForm();
  renderList();
  status.textContent = "初期状態に戻しました。";
});

clearForm();
renderList();
