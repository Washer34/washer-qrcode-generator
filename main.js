const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const QRCode = require("qrcode");
const sharp = require("sharp");
const fs = require("fs");

let mainWindow;

app.whenReady().then(() => {
  mainWindow = new BrowserWindow({
    width: 1024,
    height: 768,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  mainWindow.loadFile("index.html");

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("open-file-dialog", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "Images", extensions: ["jpg", "png", "jpeg"] }],
  });

  if (!result.canceled && result.filePaths.length > 0) {
    return result.filePaths[0]; // ✅ Retourne le chemin de l’image sélectionnée
  } else {
    return null; // Si l'utilisateur annule
  }
});

ipcMain.on("generate-qr", async (event, { url, logoPath }) => {
  try {
    const appPath = app.isPackaged
      ? path.join(path.dirname(path.dirname(process.execPath)), "..") // 🔥 Remonte encore d'un niveau
      : __dirname;
    const savePath = app.isPackaged ? path.dirname(appPath) : appPath;

    const qrCodePath = path.join(savePath, "qrcode.png");
    const resizedLogoPath = path.join(savePath, "logo_resized.png");
    const outputPath = path.join(savePath, "qrcode_with_logo.png");

    // 🔹 1️⃣ Générer le QR Code avec correction d'erreur élevée
    await QRCode.toFile(qrCodePath, url, {
      width: 500,
      margin: 2,
      errorCorrectionLevel: "H",
    });

    if (logoPath && fs.existsSync(logoPath)) {
      // 🔹 2️⃣ Récupérer la taille du QR Code
      const qrMetadata = await sharp(qrCodePath).metadata();
      const qrSize = qrMetadata.width;

      // 🔹 3️⃣ Redimensionner le logo (30% du QR Code)
      const logoSize = Math.floor(qrSize * 0.3);
      await sharp(logoPath).resize(logoSize).toFile(resizedLogoPath);

      // 🔹 4️⃣ Fusionner le logo au centre du QR Code
      const qrImage = await sharp(qrCodePath).composite([
        {
          input: resizedLogoPath,
          top: Math.floor((qrSize - logoSize) / 2),
          left: Math.floor((qrSize - logoSize) / 2),
        },
      ]);

      await qrImage.toFile(outputPath);

      fs.unlinkSync(resizedLogoPath); // Nettoyage du fichier temporaire
    } else {
      fs.copyFileSync(qrCodePath, outputPath); // Générer sans logo
    }

    // 🔹 5️⃣ Envoi du fichier généré pour la prévisualisation
    event.reply("qr-generated", outputPath);
  } catch (error) {
    console.error("❌ Erreur lors de la génération du QR Code :", error);
  }
});
