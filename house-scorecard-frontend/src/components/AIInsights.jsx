// src/components/AIInsights.jsx
import React from 'react';
import './AIInsights.css';

function AIInsights({ property }) {
  const { 
    aiAnalysis, 
    aiOverallGrade, 
    aiRedFlags, 
    aiPositiveIndicators, 
    aiPriceAssessment,
    aiBuyerRecommendation,
    aiConfidenceScore,
    aiAnalysisSummary,
    aiAnalysisDate
  } = property;

  // Don't render if no AI analysis available
  if (!aiAnalysis && !aiOverallGrade && !aiAnalysisSummary) {
    return null;
  }

  // Helper to format confidence score
  const formatConfidence = (score) => {
    if (!score) return 'Unknown';
    return `${Math.round(score * 100)}%`;
  };

  // Helper to get grade color class
  const getGradeClass = (grade) => {
    if (!grade) return 'grade-unknown';
    switch (grade.toUpperCase()) {
      case 'A': return 'grade-a';
      case 'B': return 'grade-b';
      case 'C': return 'grade-c';
      case 'D': return 'grade-d';
      case 'F': return 'grade-f';
      default: return 'grade-unknown';
    }
  };

  // Helper to get severity class for red flags
  const getSeverityClass = (severity) => {
    switch (severity?.toLowerCase()) {
      case 'high': return 'severity-high';
      case 'medium': return 'severity-medium';
      case 'low': return 'severity-low';
      default: return 'severity-medium';
    }
  };

  // Helper to get assessment class
  const getAssessmentClass = (assessment) => {
    switch (assessment?.toLowerCase()) {
      case 'high': return 'assessment-high';
      case 'fair': return 'assessment-fair';
      case 'low': return 'assessment-low';
      default: return 'assessment-fair';
    }
  };

  return (
    <div className="ai-insights-section" data-testid="analysis-complete">
      <div className="ai-insights-header">
        <h3>🤖 AI Property Analysis</h3>
        {aiConfidenceScore && (
          <div className="confidence-badge" data-testid="ai-confidence">
            Confidence: {formatConfidence(aiConfidenceScore)}
          </div>
        )}
      </div>

      {/* Overall Grade */}
      {aiOverallGrade && (
        <div className="ai-grade-section">
          <div className={`ai-grade-badge ${getGradeClass(aiOverallGrade)}`} data-testid="ai-grade">
            Grade: {aiOverallGrade}
          </div>
          {aiPriceAssessment && (
            <div className={`price-assessment ${getAssessmentClass(aiPriceAssessment)}`} data-testid="price-assessment">
              Price: {aiPriceAssessment}
            </div>
          )}
        </div>
      )}

      {/* Analysis Summary */}
      {aiAnalysisSummary && (
        <div className="ai-summary">
          <h4>📋 Summary</h4>
          <p>{aiAnalysisSummary}</p>
        </div>
      )}

      {/* Buyer Recommendation */}
      {aiBuyerRecommendation && (
        <div className="ai-recommendation">
          <h4>💡 Recommendation</h4>
          <p className="recommendation-text">{aiBuyerRecommendation}</p>
        </div>
      )}

      {/* Red Flags */}
      {aiRedFlags && aiRedFlags.length > 0 && (
        <div className="red-flags-section">
          <h4>⚠️ Potential Issues</h4>
          <div className="red-flags-list">
            {aiRedFlags.map((flag, index) => (
              <div key={index} className={`red-flag-item ${getSeverityClass(flag.severity)}`}>
                <div className="red-flag-header">
                  <span className="flag-issue">{flag.issue}</span>
                  {flag.severity && (
                    <span className={`severity-badge ${getSeverityClass(flag.severity)}`}>
                      {flag.severity}
                    </span>
                  )}
                </div>
                {flag.explanation && (
                  <div className="flag-explanation">{flag.explanation}</div>
                )}
                {flag.rooms_affected && flag.rooms_affected.length > 0 && (
                  <div className="affected-rooms">
                    Affects: {flag.rooms_affected.join(', ')}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Positive Indicators */}
      {aiPositiveIndicators && aiPositiveIndicators.length > 0 && (
        <div className="positive-indicators-section">
          <h4>✅ Positive Features</h4>
          <ul className="positive-indicators-list">
            {aiPositiveIndicators.map((indicator, index) => (
              <li key={index} className="positive-indicator-item">
                {indicator}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Analysis Date */}
      {aiAnalysisDate && (
        <div className="ai-analysis-footer">
          <small className="analysis-date">
            Analysis performed: {new Date(aiAnalysisDate).toLocaleString()}
          </small>
        </div>
      )}

      {/* Disclaimer */}
      <div className="ai-disclaimer">
        <small>
          💡 AI analysis is based on available photos and listing information. 
          Always verify findings with a professional inspection before making decisions.
        </small>
      </div>
    </div>
  );
}

export default AIInsights;