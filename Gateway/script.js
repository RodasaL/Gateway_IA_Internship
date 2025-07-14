const form = document.getElementById("uploadForm");
const fileInput = document.getElementById("fileInput");
const linkInput = document.getElementById("linkInput");
const modelSelect = document.getElementById("modelIA");
const output = document.getElementById("output");

const fileInputContainer = document.getElementById("fileInputContainer");
const linkInputContainer = document.getElementById("linkInputContainer");

// Alternar entre upload de ficheiro e link
document.querySelectorAll('input[name="inputType"]').forEach((el) => {
  el.addEventListener("change", () => {
    if (el.value === "file") {
      fileInputContainer.style.display = "block";
      linkInputContainer.style.display = "none";
    } else {
      fileInputContainer.style.display = "none";
      linkInputContainer.style.display = "block";
      modelSelect.value = "3"; // Se for link, assume corte de vídeo
    }
  });
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  output.innerHTML = "";

  const modelIA = modelSelect.value;
  const inputType = document.querySelector('input[name="inputType"]:checked').value;
  const formData = new FormData();
  formData.append("model_IA", modelIA);

  let originalImageURL = null;

  if (inputType === "file") {
    const file = fileInput.files[0];
    if (!file) return alert("Seleciona um ficheiro.");
    formData.append("file", file);
    if (modelIA !== "3") {
      originalImageURL = URL.createObjectURL(file);
    }
  } else {
    const link = linkInput.value.trim();
    if (!link) return alert("Insere um link.");
    formData.append("link", link);
  }

  const res = await fetch("http://localhost:3000/process", {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  const key = data.key;
  if (!key) return alert("Erro ao processar o ficheiro.");

  console.log(`[FRONT] Key: ${key}`);

  if (modelIA === "3") {
    await waitForVideoResult(key);
  } else {
    await waitForImageResult(key, originalImageURL);
  }
});

async function waitForImageResult(key, originalImageURL) {
  console.log("[FRONT] A aguardar resultado da imagem com key:", key);

  if (originalImageURL) {
    output.innerHTML = `
      <p>Imagem original:</p>
      <img src="${originalImageURL}" alt="Imagem Original" style="max-width:300px;">
    `;
  }

  try {
    const res = await fetch(`http://localhost:3000/status/${key}`);
    const data = await res.json();
    console.log("[FRONT] Resultado da imagem:", data);

    if (data.status === "done") {
      output.innerHTML += `
        <p>Imagem processada:</p>
        <img src="${data.url}" alt="Resultado IA" style="max-width:300px;">
      `;
    } else if (data.status === "error") {
      output.innerHTML += `<p style="color:red;">Erro ao processar a imagem.</p>`;
    } else if (data.status === "timeout") {
      output.innerHTML += `<p style="color:orange;">Aguardou-se demasiado tempo sem resultado.</p>`;
    }
  } catch (err) {
    console.error("[FRONT] Erro ao obter resultado:", err);
    output.innerHTML += `<p style="color:red;">Erro na comunicação com o servidor.</p>`;
  }
}

async function waitForVideoResult(key) {
  console.log("[FRONT] A aguardar resultado do vídeo com key:", key);

  try {
    const res = await fetch(`http://localhost:3000/status/video/${key}`);
    const data = await res.json();
    console.log("[FRONT] Resultado do vídeo:", data);

    if (data.status === "done") {
      output.innerHTML = `<p>Clips de vídeo processados:</p>`;
      data.urls.forEach(url => {
        const video = document.createElement("video");
        video.controls = true;
        video.src = url;
        video.style.maxWidth = "400px";
        video.style.display = "block";
        video.style.marginBottom = "10px";
        output.appendChild(video);
      });
    } else if (data.status === "error") {
      output.innerHTML = `<p style="color:red;">Erro ao processar o vídeo.</p>`;
    } else if (data.status === "timeout") {
      output.innerHTML = `<p style="color:orange;">Tempo de espera esgotado sem obter resposta.</p>`;
    }
  } catch (err) {
    console.error("[FRONT] Erro ao obter resultado:", err);
    output.innerHTML = `<p style="color:red;">Erro na comunicação com o servidor.</p>`;
  }
}
