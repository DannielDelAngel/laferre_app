import nodemailer from "nodemailer";

export async function POST(req: Request) {
  try {
    const { pdfBase64, correoDestino } = await req.json();

    // 🔹 Configura tu cuenta de envío
    const transporter = nodemailer.createTransport({
      service: "gmail", // o "outlook", "hotmail", etc.
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"Pedidos Ferretera" <${process.env.EMAIL_USER}>`,
      to: correoDestino,
      subject: "Nuevo pedido desde la app 🧾",
      text: "Se adjunta el pedido en formato PDF.",
      attachments: [
        {
          filename: "pedido.pdf",
          content: pdfBase64.split("base64,")[1],
          encoding: "base64",
        },
      ],
    });

    return new Response(JSON.stringify({ ok: true }));
  } catch (err) {
    console.error("❌ Error al enviar correo:", err);
    return new Response(JSON.stringify({ ok: false, error: String(err) }), {
      status: 500,
    });
  }
}
