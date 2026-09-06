import { createFileRoute } from "@tanstack/react-router";
import { Client } from "basic-ftp";
import { Readable } from "node:stream";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function detectImageExtension(bytes: Uint8Array): string | null {
  // JPEG
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return "jpg";
  }

  // PNG
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return "png";
  }

  // WEBP
  if (
    bytes.length >= 12 &&
    String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...bytes.slice(8, 12)) === "WEBP"
  ) {
    return "webp";
  }

  // GIF
  if (bytes.length >= 6) {
    const signature = String.fromCharCode(...bytes.slice(0, 6));
    if (signature === "GIF87a" || signature === "GIF89a") {
      return "gif";
    }
  }

  return null;
}

function resolveRemoteDirectory(folder: string): string | null {
  if (folder === "author-avatars") return "avatars";
  if (folder === "author-covers") return "author-covers";
  if (folder === "novels") return "covers";

  if (/^novel-[0-9a-f-]{36}$/i.test(folder)) {
    return "covers";
  }

  return null;
}

export const Route = createFileRoute("/api/media-upload")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const contentLength = Number(
            request.headers.get("content-length") || "0",
          );

          if (contentLength > 6 * 1024 * 1024) {
            return Response.json(
              { error: "حجم الطلب كبير جدًا." },
              { status: 413 },
            );
          }

          // Authentication
          const authHeader = request.headers.get("authorization");

          if (!authHeader?.startsWith("Bearer ")) {
            return Response.json(
              { error: "غير مصرح." },
              { status: 401 },
            );
          }

          const token = authHeader.slice(7).trim();

          if (!token) {
            return Response.json(
              { error: "غير مصرح." },
              { status: 401 },
            );
          }

          const { supabaseAdmin } = await import(
            "@/integrations/supabase/client.server"
          );

          const {
            data: { user },
            error: authError,
          } = await supabaseAdmin.auth.getUser(token);

          if (authError || !user) {
            return Response.json(
              { error: "الجلسة غير صالحة." },
              { status: 401 },
            );
          }

          // Only authors/admins may upload author assets
          const { data: roles, error: roleError } = await supabaseAdmin
            .from("user_roles")
            .select("role")
            .eq("user_id", user.id);

          if (roleError) {
            console.error("[media-upload] role lookup failed", roleError);
            return Response.json(
              { error: "تعذر التحقق من الصلاحيات." },
              { status: 500 },
            );
          }

          const allowedRole = (roles ?? []).some(({ role }) =>
            ["author", "admin"].includes(role),
          );

          if (!allowedRole) {
            return Response.json(
              { error: "ليس لديك صلاحية رفع الصور." },
              { status: 403 },
            );
          }

          const formData = await request.formData();
          const file = formData.get("file");
          const folder = String(formData.get("folder") || "");

          if (!(file instanceof File)) {
            return Response.json(
              { error: "لم يتم إرسال صورة." },
              { status: 400 },
            );
          }

          if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
            return Response.json(
              { error: "حجم الصورة يجب ألا يتجاوز 5MB." },
              { status: 400 },
            );
          }

          const remoteDirectory = resolveRemoteDirectory(folder);

          if (!remoteDirectory) {
            return Response.json(
              { error: "مجلد الرفع غير مسموح." },
              { status: 400 },
            );
          }

          const buffer = Buffer.from(await file.arrayBuffer());
          const extension = detectImageExtension(new Uint8Array(buffer));

          if (!extension) {
            return Response.json(
              { error: "نوع الصورة غير مدعوم." },
              { status: 400 },
            );
          }

          const host = process.env.FAVNOL_MEDIA_FTP_HOST;
          const username = process.env.FAVNOL_MEDIA_FTP_USER;
          const passwordB64 = process.env.FAVNOL_MEDIA_FTP_PASSWORD_B64;
          const baseUrl = process.env.FAVNOL_MEDIA_BASE_URL;

          if (!host || !username || !passwordB64 || !baseUrl) {
            console.error("[media-upload] Missing media environment variables");
            return Response.json(
              { error: "خدمة رفع الصور غير مهيأة." },
              { status: 500 },
            );
          }

          const password = Buffer.from(passwordB64, "base64").toString("utf8");
          const filename = `${crypto.randomUUID()}.${extension}`;

          const ftp = new Client(20_000);

          try {
            await ftp.access({
              host,
              user: username,
              password,
              secure: true,
            });

            await ftp.cd(remoteDirectory);

            await ftp.uploadFrom(
              Readable.from(buffer),
              filename,
            );
          } finally {
            ftp.close();
          }

          const url =
            `${baseUrl.replace(/\/+$/, "")}/${remoteDirectory}/${filename}`;

          return Response.json(
            { url },
            {
              headers: {
                "Cache-Control": "no-store",
              },
            },
          );
        } catch (error) {
          console.error("[media-upload] upload failed", error);

          return Response.json(
            { error: "تعذر رفع الصورة، حاول مرة أخرى." },
            { status: 500 },
          );
        }
      },
    },
  },
});
