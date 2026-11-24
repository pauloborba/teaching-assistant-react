import { EmailSender, EmailSenderSmtp, ResultadoEnvio as SendResult } from './EmailSender';
import { Student } from './Student';

export interface GradeNotificationResult extends SendResult {
  ignored: boolean;
  emailAlert?: string;
}

export class GradeNotification {
  private readonly notificationsInProgress = new Set<string>();

  constructor(
    private readonly emailSender: EmailSender | Pick<EmailSenderSmtp, 'send'>
  ) {}

  async notify(
    student: Student,
    goal: string,
    grade: string | null | undefined,
    topic: string,
    now: Date = new Date()
  ): Promise<GradeNotificationResult> {
    if (!student.email) {
      return {
        aceito: false,
        ignored: true,
        emailAlert: 'No email address registered for this student'
      };
    }

    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    if (student.lastGradeNotificationDate === today) {
      return { aceito: false, ignored: true };
    }

    const studentCPF = student.getCPF();
    if (this.notificationsInProgress.has(studentCPF)) {
      return { aceito: false, ignored: true };
    }

    const gradeChange = grade ? `updated to ${grade}` : 'removed';
    this.notificationsInProgress.add(studentCPF);
    try {
      const sendResult: SendResult = await this.emailSender.send(
        student.email,
        `Grade update: ${topic}`,
        `Hello ${student.name}, your grade for ${goal} in ${topic} has been ${gradeChange}.`
      );

      if (sendResult.aceito) {
        student.lastGradeNotificationDate = today;
        return { ...sendResult, ignored: false };
      }

      return {
        ...sendResult,
        ignored: false,
        emailAlert: sendResult.descricaoFalha || 'Email notification could not be sent'
      };
    } catch (error) {
      console.error('Failed to send grade notification:', error);
      return {
        aceito: false,
        ignored: false,
        emailAlert: 'Email notification could not be sent'
      };
    } finally {
      this.notificationsInProgress.delete(studentCPF);
    }
  }
}
