import { google } from "googleapis";

function getDriveClient() {
  const keyEnv = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  if (!keyEnv) throw new Error("GOOGLE_SERVICE_ACCOUNT_KEY no configurado");
  const credentials = JSON.parse(keyEnv);
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
  return google.drive({ version: "v3", auth });
}

const CARPETAS_CLIENTE = [
  "01-Brief",
  "02-Investigacion",
  "03-Personas",
  "04-Estrategia",
  "05-Creativos",
  "06-Lanzamiento",
  "07-Reportes",
];

async function crearCarpeta(
  drive: ReturnType<typeof google.drive>,
  nombre: string,
  parentId: string
): Promise<string> {
  const res = await drive.files.create({
    requestBody: {
      name: nombre,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
  });
  return res.data.id!;
}

async function compartirCarpeta(
  drive: ReturnType<typeof google.drive>,
  fileId: string,
  email: string,
  role: "reader" | "writer"
) {
  await drive.permissions.create({
    fileId,
    requestBody: { type: "user", role, emailAddress: email },
    sendNotificationEmail: false,
  });
}

export async function crearEstructuraDriveCliente(
  nombreCliente: string,
  emailCliente: string,
  emailAccountManager?: string
): Promise<{ rootId: string; carpetas: Record<string, string> }> {
  const drive = getDriveClient();
  const rootParent = process.env.GOOGLE_DRIVE_FOLDER_ROOT;

  if (!rootParent) throw new Error("GOOGLE_DRIVE_FOLDER_ROOT no configurado");

  const rootId = await crearCarpeta(drive, nombreCliente.toUpperCase(), rootParent);

  const carpetas: Record<string, string> = {};
  for (const nombre of CARPETAS_CLIENTE) {
    carpetas[nombre] = await crearCarpeta(drive, nombre, rootId);
  }

  // Cliente: solo lectura en carpeta raíz (no-fatal si el email no tiene cuenta Google)
  await compartirCarpeta(drive, rootId, emailCliente, "reader").catch((e) =>
    console.warn(`[drive] No se pudo compartir con ${emailCliente}:`, e?.message)
  );

  // Account Manager: escritura en todas
  if (emailAccountManager) {
    await compartirCarpeta(drive, rootId, emailAccountManager, "writer").catch((e) =>
      console.warn(`[drive] No se pudo compartir con ${emailAccountManager}:`, e?.message)
    );
  }

  return { rootId, carpetas };
}

export async function subirArchivoADrive(
  fileBuffer: Buffer,
  fileName: string,
  mimeType: string,
  folderId: string
): Promise<string> {
  const drive = getDriveClient();
  const { Readable } = await import("stream");

  const res = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [folderId],
    },
    media: {
      mimeType,
      body: Readable.from(fileBuffer),
    },
    fields: "id, webViewLink",
  });

  return res.data.webViewLink || res.data.id!;
}

export async function obtenerLinkCarpeta(folderId: string): Promise<string> {
  const drive = getDriveClient();
  const res = await drive.files.get({ fileId: folderId, fields: "webViewLink" });
  return res.data.webViewLink || `https://drive.google.com/drive/folders/${folderId}`;
}
