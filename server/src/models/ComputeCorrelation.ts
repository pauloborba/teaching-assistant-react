import { DomainError } from './DomainError';

/** Calculates Pearson's correlation coefficient for two equally sized series. */
export class ComputeCorrelation {
  compute(variables: [number[], number[]]): number {
    const [left, right] = variables;
    if (left.length !== right.length || left.length < 2) {
      throw new DomainError('At least two common student results are required');
    }

    const leftAverage = left.reduce((sum, value) => sum + value, 0) / left.length;
    const rightAverage = right.reduce((sum, value) => sum + value, 0) / right.length;
    const covariance = left.reduce((sum, value, index) =>
      sum + (value - leftAverage) * (right[index] - rightAverage), 0);
    const leftVariance = left.reduce((sum, value) => sum + (value - leftAverage) ** 2, 0);
    const rightVariance = right.reduce((sum, value) => sum + (value - rightAverage) ** 2, 0);

    if (leftVariance === 0 || rightVariance === 0) {
      throw new DomainError('Correlation cannot be calculated when all results are identical');
    }
    return covariance / Math.sqrt(leftVariance * rightVariance);
  }
}
