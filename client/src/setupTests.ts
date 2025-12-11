// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Suprime warnings conhecidos que não afetam os testes
const originalError = console.error;
const originalWarn = console.warn;

beforeAll(() => {
  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    if (
      message.includes('Warning: An update to') ||
      message.includes('Failed prop type') ||
      message.includes('Invalid prop')
    ) {
      return;
    }
    originalError.call(console, ...args);
  };

  console.warn = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    if (
      message.includes('React Router Future Flag Warning') ||
      message.includes('v7_startTransition') ||
      message.includes('v7_relativeSplatPath')
    ) {
      return;
    }
    originalWarn.call(console, ...args);
  };
});

afterAll(() => {
  console.error = originalError;
  console.warn = originalWarn;
});

