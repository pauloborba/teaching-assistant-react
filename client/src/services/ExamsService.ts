class ExamsService {
  private static apiUrl: string = "http://localhost:3005/api";

  public static async correctExam(
    examId: string,
    answers: Record<string, any>
  ): Promise<any> {
    const response = await fetch(`${ExamsService.apiUrl}/correct/${examId}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(answers),
    });

    if (!response.ok) {
      throw new Error("Failed to correct exam");
    }

    return response.json();
  }

  /**
   * Generate randomized student exams with different questions for each student
   * @param examId - The exam ID
   * @param classId - The class ID
   * @returns Promise with generated exams data
   */
  public static async generateStudentExams(
    examId: number,
    classId: string
  ): Promise<any> {
    const response = await fetch(
      `${ExamsService.apiUrl
      }/exams/${examId}/generate?classId=${encodeURIComponent(classId)}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        error.message || "Falha ao gerar os exames individuais dos alunos"
      );
    }

    return response.json();
  }

  /**
   * Create an exam
   * @param examData - The exam data to create
   * @param classId - The class ID
   * @returns examResponse - Promise request data
   */
  public static async createExams(
    examData: any,
    classId: string
  ): Promise<any> {
    // First, create the exam
    const createResponse = await fetch(`${ExamsService.apiUrl}/exams`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        nomeProva: examData.nomeProva,
        quantidadeAberta: parseInt(examData.abertas, 10),
        quantidadeFechada: parseInt(examData.fechadas, 10),
        questionIds: examData.questionIds || [],
        classId: classId,
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.json();
      throw new Error(error.error || "Falha ao criar o exame");
    }

    const examResponse = await createResponse.json();

    return examResponse;
  }

  /**
   * Get all exams for a specific class
   * @param classId - The class ID
   * @returns Promise with array of exams
   */
  public static async getExamsForClass(classId: string): Promise<any> {
    const response = await fetch(
      `${ExamsService.apiUrl}/exams/class/${encodeURIComponent(classId)}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || "Falha ao buscar provas da turma");
    }

    return data;
  }

  /**
   * Get students with their exam information for a specific class
   * @param classId - The class ID
   * @param examId - Optional exam ID to filter by specific exam
   * @returns Promise with array of students with exam data
   */
  public static async getStudentsWithExamsForClass(
    classId: string,
    examId?: number
  ): Promise<any> {
    let url = `${ExamsService.apiUrl}/exams/students?classId=${encodeURIComponent(classId)}`;
    if (examId) {
      url += `&examId=${examId}`;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch students with exams");
    }

    return response.json();
  }

  /**
   * Delete an exam by its ID
   * @param examId - The exam ID to delete
   * @param classId - The class ID (for validation)
   * @returns Promise with deletion confirmation
   */
  public static async deleteExam(
    examId: number,
    classId: string
  ): Promise<any> {
    const response = await fetch(
      `${ExamsService.apiUrl}/exams/${examId}?classId=${encodeURIComponent(classId)}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || "Falha ao deletar a prova");
    }

    return response.json();
  }

  public static async downloadExamPDF(examId: string): Promise<void> {
    try {
      const response = await fetch(
        `${ExamsService.apiUrl}/exams/${examId}/pdf`,
        {
          method: "GET",
          headers: {
            Accept: "application/pdf",
          },
        }
      );

      if (!response.ok) {
        const status = response.status;
        let errorMessage = "Falha ao baixar o PDF.";

        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) { }
        if (status === 404) {
          throw new Error("Prova não encontrada.");
        }
        if (status === 403) {
          throw new Error("Você não tem permissão para baixar esta prova.");
        }
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(
        new Blob([blob], { type: "application/pdf" })
      );
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `prova-${examId}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading exam PDF:", error);
      throw error;
    }
  }

  public static async downloadExamsZIP(examId: string, quantity: number, classId: string, date: string): Promise<void> {
    try {
      const response = await fetch(`${ExamsService.apiUrl}/exams/${examId}/zip?quantity=${quantity}&classId=${classId}&date=${date}`, {
        method: 'GET',
        headers: {
          'Accept': 'application/zip',
        },
      });

      if (!response.ok) {
        const status = response.status;
        let errorMessage = 'Falha ao baixar o ZIP.';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) { }

        if (status === 404) throw new Error('Prova não encontrada.');
        if (status === 400) throw new Error(errorMessage);
        throw new Error(errorMessage);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(
        new Blob([blob], { type: 'application/zip' })
      );
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Lote_Provas_${examId}.zip`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Error downloading exams ZIP:', error);
      throw error;
    }
  }

  public static async getGenerations(examId: number, classId: string): Promise<any> {
    const response = await fetch(`${ExamsService.apiUrl}/exams/${examId}/generations?classId=${encodeURIComponent(classId)}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || "Failed to fetch generations");
    }

    return response.json();
  }
}

export default ExamsService;
