// src/components/AIComparisonSummary.jsx
import React, { useState } from 'react';
import './AIComparisonSummary.css';

const AIComparisonSummary = ({ properties }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  
  // Filter properties that have AI analysis
  const propertiesWithAI = properties.filter(prop => 
    prop.aiAnalysis || prop.aiOverallGrade || (prop.aiRedFlags && prop.aiRedFlags.length > 0)
  );

  if (propertiesWithAI.length < 2) {
    return (
      <div className="ai-comparison-summary">
        <div className="ai-summary-header" onClick={() => setIsCollapsed(!isCollapsed)}>
          <h2>🤖 AI Comparison Summary</h2>
          <button className="collapse-button">
            <i className={`fas ${isCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'}`}></i>
          </button>
        </div>
        {!isCollapsed && (
          <div className="ai-summary-content">
            <div className="no-ai-data">
              <p>AI comparison requires at least 2 properties with AI analysis.</p>
              <p>Run AI analysis on your properties to see intelligent comparisons here.</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Helper function to get grade numeric value for comparison
  const getGradeValue = (grade) => {
    const gradeMap = { 'A': 5, 'B': 4, 'C': 3, 'D': 2, 'F': 1 };
    return gradeMap[grade] || 0;
  };

  // Helper function to get grade color class
  const getGradeClass = (grade) => {
    const classMap = { 'A': 'grade-a', 'B': 'grade-b', 'C': 'grade-c', 'D': 'grade-d', 'F': 'grade-f' };
    return classMap[grade] || 'grade-unknown';
  };

  // Determine the winner based on AI analysis
  const determineWinner = () => {
    const bestGrade = propertiesWithAI.reduce((best, prop) => {
      const currentGradeValue = getGradeValue(prop.aiOverallGrade);
      const bestGradeValue = getGradeValue(best.aiOverallGrade);
      
      if (currentGradeValue > bestGradeValue) {
        return prop;
      } else if (currentGradeValue === bestGradeValue) {
        // If grades are tied, prefer property with fewer red flags
        const currentRedFlags = prop.aiRedFlags?.length || 0;
        const bestRedFlags = best.aiRedFlags?.length || 0;
        
        if (currentRedFlags < bestRedFlags) {
          return prop;
        } else if (currentRedFlags === bestRedFlags) {
          // If red flags are also tied, prefer higher confidence
          const currentConfidence = prop.aiConfidenceScore || 0;
          const bestConfidence = best.aiConfidenceScore || 0;
          return currentConfidence > bestConfidence ? prop : best;
        }
      }
      return best;
    });

    return bestGrade;
  };

  // Calculate risk comparison
  const getRiskComparison = () => {
    const riskData = propertiesWithAI.map(prop => {
      const redFlags = prop.aiRedFlags || [];
      const highSeverityFlags = redFlags.filter(flag => flag.severity === 'high').length;
      const mediumSeverityFlags = redFlags.filter(flag => flag.severity === 'medium').length;
      const lowSeverityFlags = redFlags.filter(flag => flag.severity === 'low').length;
      
      return {
        property: prop,
        totalFlags: redFlags.length,
        highSeverity: highSeverityFlags,
        mediumSeverity: mediumSeverityFlags,
        lowSeverity: lowSeverityFlags,
        riskScore: highSeverityFlags * 3 + mediumSeverityFlags * 2 + lowSeverityFlags * 1
      };
    });

    riskData.sort((a, b) => a.riskScore - b.riskScore); // Lower risk score is better
    
    return riskData;
  };

  const winner = determineWinner();
  const riskComparison = getRiskComparison();
  const lowestRisk = riskComparison[0];
  const highestRisk = riskComparison[riskComparison.length - 1];

  return (
    <div className="ai-comparison-summary">
      <div className="ai-summary-header" onClick={() => setIsCollapsed(!isCollapsed)}>
        <h2>🤖 AI Comparison Summary</h2>
        <button className="collapse-button">
          <i className={`fas ${isCollapsed ? 'fa-chevron-down' : 'fa-chevron-up'}`}></i>
        </button>
      </div>
      
      {!isCollapsed && (
        <div className="ai-summary-content">
          {/* Winner Section */}
          <div className="winner-section">
            <div className="winner-badge">
              <span className="winner-icon">🏆</span>
              <div className="winner-info">
                <h3>AI Recommended Winner</h3>
                <div className="winner-property">
                  <strong>{winner.address}</strong>
                  <span className={`grade-badge ${getGradeClass(winner.aiOverallGrade)}`}>
                    Grade {winner.aiOverallGrade || 'N/A'}
                  </span>
                </div>
                <p className="winner-reason">
                  {winner.aiBuyerRecommendation || winner.aiAnalysisSummary || 'Best overall condition and value'}
                </p>
              </div>
            </div>
          </div>

          {/* Side-by-side Grades */}
          <div className="grades-comparison">
            <h3>AI Grades Comparison</h3>
            <div className="grades-grid">
              {propertiesWithAI.map(prop => (
                <div key={prop.id} className="grade-card">
                  <div className="property-name">{prop.address}</div>
                  <div className={`grade-display ${getGradeClass(prop.aiOverallGrade)}`}>
                    {prop.aiOverallGrade || 'N/A'}
                  </div>
                  <div className="confidence-score">
                    Confidence: {prop.aiConfidenceScore ? Math.round(prop.aiConfidenceScore * 100) : 0}%
                  </div>
                  <div className="red-flags-count">
                    {(prop.aiRedFlags?.length || 0)} issues found
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Risk Assessment */}
          <div className="risk-assessment">
            <h3>Risk Assessment</h3>
            <div className="risk-comparison-grid">
              <div className="risk-card lowest-risk">
                <div className="risk-header">
                  <span className="risk-icon">🟢</span>
                  <span className="risk-title">Lowest Risk</span>
                </div>
                <div className="risk-property">{lowestRisk.property.address}</div>
                <div className="risk-details">
                  <div className="risk-stat">
                    <span className="risk-number">{lowestRisk.totalFlags}</span>
                    <span className="risk-label">total issues</span>
                  </div>
                  {lowestRisk.highSeverity > 0 && (
                    <div className="risk-breakdown high">
                      {lowestRisk.highSeverity} high severity
                    </div>
                  )}
                </div>
              </div>

              {highestRisk !== lowestRisk && (
                <div className="risk-card highest-risk">
                  <div className="risk-header">
                    <span className="risk-icon">🔴</span>
                    <span className="risk-title">Highest Risk</span>
                  </div>
                  <div className="risk-property">{highestRisk.property.address}</div>
                  <div className="risk-details">
                    <div className="risk-stat">
                      <span className="risk-number">{highestRisk.totalFlags}</span>
                      <span className="risk-label">total issues</span>
                    </div>
                    {highestRisk.highSeverity > 0 && (
                      <div className="risk-breakdown high">
                        {highestRisk.highSeverity} high severity
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Insights */}
          <div className="quick-insights">
            <h3>Key Insights</h3>
            <div className="insights-list">
              {propertiesWithAI.length > 1 && (
                <div className="insight-item">
                  <span className="insight-icon">📊</span>
                  <span className="insight-text">
                    Grade range: {propertiesWithAI.map(p => p.aiOverallGrade).filter(Boolean).sort().join(' to ')}
                  </span>
                </div>
              )}
              
              {lowestRisk.totalFlags === 0 ? (
                <div className="insight-item">
                  <span className="insight-icon">✅</span>
                  <span className="insight-text">
                    {lowestRisk.property.address} has no major issues detected
                  </span>
                </div>
              ) : highestRisk.totalFlags - lowestRisk.totalFlags >= 3 && (
                <div className="insight-item">
                  <span className="insight-icon">⚠️</span>
                  <span className="insight-text">
                    {highestRisk.property.address} has {highestRisk.totalFlags - lowestRisk.totalFlags} more issues than {lowestRisk.property.address}
                  </span>
                </div>
              )}

              {propertiesWithAI.some(p => p.aiPriceAssessment === 'high') && (
                <div className="insight-item">
                  <span className="insight-icon">💰</span>
                  <span className="insight-text">
                    Some properties may be overpriced based on condition
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIComparisonSummary;