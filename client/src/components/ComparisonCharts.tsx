import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { ReportData } from '../types/Report';
import { Class } from '../types/Class';

interface ComparisonChartsProps {
  selectedClasses: Class[];
  comparisonReports: { [classId: string]: ReportData };
}

const ComparisonCharts: React.FC<ComparisonChartsProps> = ({ 
  selectedClasses, 
  comparisonReports 
}) => {
  const [activeChart, setActiveChart] = useState<'overview' | 'approval' | 'grades' | 'above'>('overview');

  // Only use classes that have a loaded report
  const validSelected = selectedClasses.filter(c => comparisonReports && comparisonReports[c.id]);

  // Prepare data for overview chart (enrollment and approval rates)
  const overviewData = validSelected.map(classObj => {
    const report = comparisonReports[classObj.id];
    return {
      name: `${classObj.topic.substring(0, 15)}...`,
      fullName: classObj.topic,
      enrolled: report?.totalEnrolled ?? 0,
      approved: report?.approvedCount ?? 0,
      failed: report?.notApprovedCount ?? 0,
      approvalRate: report && report.totalEnrolled > 0 
        ? Math.round((report.approvedCount / report.totalEnrolled) * 100)
        : 0,
    };
  });

  // Prepare data for approval chart
  const approvalData = validSelected.map(classObj => {
    const report = comparisonReports[classObj.id];
    const approvalRate = report.totalEnrolled > 0 
      ? Math.round((report.approvedCount / report.totalEnrolled) * 100)
      : 0;
    return {
      name: `${classObj.topic.substring(0, 15)}...`,
      fullName: classObj.topic,
      'Approval Rate (%)': approvalRate,
      'Failed Rate (%)': 100 - approvalRate,
    };
  });

  // Prepare data for grades chart
  const gradesData = validSelected.map(classObj => {
    const report = comparisonReports[classObj.id];
    return {
      name: `${classObj.topic.substring(0, 15)}...`,
      fullName: classObj.topic,
      'Mean Grade': parseFloat(report.studentsAverage?.toFixed(2) ?? 'N/A'),
    };
  });

  // Prepare data for 'students above average' chart
  // Note: if the report contains an explicit studentsAboveAverage metric use it, otherwise use approvedCount as a proxy
  const aboveData = validSelected.map(classObj => {
    const report = comparisonReports[classObj.id];
    const above = (report as any).studentsAboveAverage ?? report.approvedCount;
    return {
      name: `${classObj.topic.substring(0, 15)}...`,
      fullName: classObj.topic,
      'Students Above Avg': above,
    };
  });

  if (validSelected.length === 0) {
    return (
      <div className="comparison-charts-container">
        <div className="chart-wrapper">
          <p style={{ textAlign: 'center', color: '#6b7280' }}>No reports available for the selected classes yet. Please add classes that have generated reports.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="comparison-charts-container">
      {/* Chart Type Selector */}
      <div className="chart-selector">
        <button
          className={`chart-btn ${activeChart === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveChart('overview')}
        >
          Overview
        </button>
        <button
          className={`chart-btn ${activeChart === 'approval' ? 'active' : ''}`}
          onClick={() => setActiveChart('approval')}
        >
          Approval Rates
        </button>
        <button
          className={`chart-btn ${activeChart === 'above' ? 'active' : ''}`}
          onClick={() => setActiveChart('above')}
        >
          Students Above Average
        </button>
        <button
          className={`chart-btn ${activeChart === 'grades' ? 'active' : ''}`}
          onClick={() => setActiveChart('grades')}
        >
          Mean Grades
        </button>
      </div>

      {/* Overview Chart - Enrollment and Students */}
      {activeChart === 'overview' && (
        <div className="chart-wrapper">
          <h4>Enrollment & Approval Overview</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={overviewData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                formatter={(value: any) => {
                  if (typeof value === 'number') return value.toFixed(0);
                  return value;
                }}
                labelFormatter={(label) => {
                  const fullData = overviewData.find(d => d.name === label);
                  return fullData ? fullData.fullName : label;
                }}
              />
              <Legend />
              <Bar dataKey="enrolled" fill="#3b82f6" name="Total Enrolled" />
              <Bar dataKey="approved" fill="#10b981" name="Approved" />
              <Bar dataKey="failed" fill="#ef4444" name="Failed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Approval Rate Chart */}
      {activeChart === 'approval' && (
        <div className="chart-wrapper">
          <h4>Approval vs Failure Rates (%)</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={approvalData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                formatter={(value) => `${value}%`}
                labelFormatter={(label) => {
                  const fullData = approvalData.find(d => d.name === label);
                  return fullData ? fullData.fullName : label;
                }}
              />
              <Legend />
              <Bar dataKey="Approval Rate (%)" fill="#10b981" />
              <Bar dataKey="Failed Rate (%)" fill="#ef4444" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Grades Chart */}
      {activeChart === 'grades' && (
        <div className="chart-wrapper">
          <h4>Mean Grade Comparison</h4>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={gradesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis domain={[0, 10]} />
              <Tooltip 
                formatter={(value: any) => {
                  if (typeof value === 'number') return value.toFixed(2);
                  return value;
                }}
                labelFormatter={(label) => {
                  const fullData = gradesData.find(d => d.name === label);
                  return fullData ? fullData.fullName : label;
                }}
              />
              <Legend />
              <Line 
                type="monotone" 
                dataKey="Mean Grade" 
                stroke="#8b5cf6" 
                strokeWidth={3}
                dot={{ fill: '#8b5cf6', r: 6 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Students Above Average Chart */}
      {activeChart === 'above' && (
        <div className="chart-wrapper">
          <h4>Students Above Average</h4>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={aboveData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip 
                formatter={(value: any) => {
                  if (typeof value === 'number') return value.toFixed(0);
                  return value;
                }}
                labelFormatter={(label) => {
                  const fullData = aboveData.find(d => d.name === label);
                  return fullData ? fullData.fullName : label;
                }}
              />
              <Legend />
              <Bar dataKey="Students Above Avg" fill="#f59e0b" name="Students Above Avg" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Chart Legend Info */}
      <div className="chart-info">
        <p>
          <strong>Tip:</strong> Hover over the charts to see detailed values. Switch between different views to compare classes across different metrics.
        </p>
      </div>
    </div>
  );
};

export default ComparisonCharts;
