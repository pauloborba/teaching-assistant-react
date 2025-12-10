import dotenv from "dotenv";
import nodemailer from "nodemailer";

dotenv.config();

export async function enviarEmail(professor: string,emailAluno: string,assunto: string,mensagem: string): Promise<void> {

  try {

        const transporter = nodemailer.createTransport({

        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure: process.env.SMTP_SECURE === "true",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },

    });

    const info = await transporter.sendMail({

      from: `${professor} <${process.env.SMTP_USER}>`,
      to: emailAluno,
      subject: assunto,
      text: mensagem,
      
    });

    console.log("E-mail enviado com sucesso!");

  } catch (erro: any) {
    
    console.error("Erro ao enviar e-mail:",);
  }
  
}
