

## Rodar testes

### GUI

Precisa ligar o backend e o frontend antes de rodar os testes GUI
```bash
cd client
npm run test:cucumber -- --tags @create-exam
```
---
### Serviço
```bash
cd server
npm test -- ./tests/unit/exam.class.test.ts 
npm test -- ./tests/unit/exams.test.ts 
npm test -- ./tests/integration/provas.test.ts 
```
---
## Refactor

[ExamsService static methods](https://github.com/rafael-pf/teaching-assistant-react-exams/commit/273eacb7ec21aeb17c5c1796d7dce579619a9528)

[Create Exam extract validation](https://github.com/rafael-pf/teaching-assistant-react-exams/commit/b3ac00f70d8a7376521113bf2d5792da4abb0249)

[convert loadAllData to useCallback exampage](https://github.com/rafael-pf/teaching-assistant-react-exams/commit/4e2f0c08790db03c906f135c0ef351e69029e03a)
