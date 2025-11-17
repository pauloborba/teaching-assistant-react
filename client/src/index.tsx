import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import './styles/variables.css';
import App from './App';
import ExamplePage from './pages/ExamplePage';
import ExamPage from './pages/ExamPage';
import Exam from './pages/Exam';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Rota padrão - mantém o App com sistema de tabs */}
        <Route path="/" element={<App />} />

        {/* Novas páginas com roteamento */}
        <Route path="/example" element={<ExamplePage />} />

        {/* Adicione mais rotas aqui conforme necessário */}
        <Route path='/exam' element={<Exam />} />
        <Route path="/exam" element={<ExamPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);