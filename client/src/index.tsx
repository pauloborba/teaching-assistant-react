import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';
import ImportSuccess from './components/ImportSuccess';
import ImportError from './components/ImportError';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<App />} />
        <Route path="/import-success" element={<ImportSuccess />} />
        <Route path="/import-error" element={<ImportError />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);