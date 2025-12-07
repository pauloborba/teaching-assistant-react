import { Grade } from "./Evaluation";
import { TaskAnswer } from "./TaskAnswer";
import { Student } from "./Student";

export class ScriptAnswer {
  private id: string;
  private student: Student; 
  public answers: TaskAnswer[] = [];
  public grade?: Grade

  constructor(id: string, student: Student, answers?: TaskAnswer[], grade?: Grade) {
    this.id = id;
    this.student = student;
    this.answers = answers || [];
    this.grade = grade;
    if(grade && grade != "MA" && grade != "MPA" && grade != "MANA") {
      throw new Error('Invalid grade value');
    }
  }


getId(): string {
    return this.id;
}

toJSON() {
  return {
    id: this.id,
    student: this.student.toJSON(),
    answers: this.answers.map(answer => {
      if (answer && typeof answer.toJSON === "function") {
        return answer.toJSON();
      }
      console.warn("Invalid answer detected:", answer);
      return null;
    }).filter(Boolean),
    grade: this.grade ? this.grade : undefined
  };
}




  // answer management

  findAnswerByTaskId(taskId: string): TaskAnswer | undefined {
    return this.answers.find(answer => 
      answer.getTaskId() === taskId
    );
  }

  addAnswer(answer: TaskAnswer): TaskAnswer {
    // Check if task already in script
    const existingAnswer = this.findAnswerByTaskId(answer.task.getId());
    if (existingAnswer) {
      throw new Error('Answer for task already in script');
    }

    this.answers.push(answer);
    return answer;
  }

  
 removeAnswer(taskId: string): boolean {
    const index = this.answers.findIndex(answer => 
      answer.getTaskId() === taskId
    );
    
    if (index === -1) {
      return false;
    }

    this.answers.splice(index, 1);
    return true;
  }


  
// grade Management

  updateGrade(grade: Grade | undefined) {
    if(grade && grade != "MA" && grade != "MPA" && grade != "MANA") {
      throw new Error('Invalid grade value');
    }
    this.grade = grade;
  }

 private getNumberOfAnswersWithGrade(grade : Grade): number { 
    if (grade !== 'MANA' && grade !== 'MPA' && grade !== 'MA') {
      throw new Error('Invalid grade');
    }
    return this.answers.filter(answer => answer.getGrade() === grade).length;
 }



 getGradeDistribution(): Record<Grade, number> {
    return {
      'MANA': this.getNumberOfAnswersWithGrade('MANA'),
      'MPA': this.getNumberOfAnswersWithGrade('MPA'),
      'MA': this.getNumberOfAnswersWithGrade('MA'),
    };
 }



}