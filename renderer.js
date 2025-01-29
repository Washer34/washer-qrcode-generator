const { ipcRenderer } = require("electron");

let selectedLogoPath = null; // 🔹 Variable pour stocker le chemin du logo sélectionné

document.getElementById("logoPickerBtn").addEventListener("click", () => {
  // 🔹 1️⃣ Ouvrir un explorateur de fichiers une seule fois pour choisir l’image
  ipcRenderer.invoke("open-file-dialog").then((logoPath) => {
    if (logoPath) {
      selectedLogoPath = logoPath; // 🔥 Stocker le chemin du logo sélectionné
      document.getElementById(
        "logoPathDisplay"
      ).innerText = `Logo sélectionné : ${logoPath}`;
    }
  });
});

document.getElementById("generateBtn").addEventListener("click", () => {
  const url = document.getElementById("url").value;

  if (!url.trim()) {
    alert("❌ Veuillez entrer une URL valide !");
    return;
  }

  ipcRenderer.send("generate-qr", { url, logoPath: selectedLogoPath });
});

// ✅ Met à jour la prévisualisation après génération
ipcRenderer.on("qr-generated", (event, qrPath) => {
  const qrPreview = document.getElementById("qrPreview");
  qrPreview.src = `file://${qrPath}?timestamp=${new Date().getTime()}`; // ✅ Force le rafraîchissement
  qrPreview.style.display = "block"; // ✅ Affiche l’image après génération
});
