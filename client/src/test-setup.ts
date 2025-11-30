import '@testing-library/jest-dom';

// Extend Jest's expect with custom matchers
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeInTheDocument(): R;
    }
  }
}

// Setup for Cucumber tests
export {};