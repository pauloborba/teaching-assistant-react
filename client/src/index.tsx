import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import AlunoApp from './AlunoApp';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

const isAreaDoAluno = window.location.pathname.replace(/\/+$/, '') === '/aluno';

root.render(
  <React.StrictMode>
    {isAreaDoAluno ? <AlunoApp /> : <App />}
  </React.StrictMode>
);