// src/components/ScoreBreakdown.jsx
import React from 'react';
import { RATING_TYPE_STARS, RATING_TYPE_YES_NO, RATING_TYPE_SCALE_10 } from '../contexts/CriteriaContext';
import './ScoreBreakdown.css'; // Create this CSS file next

// Helper to display rating value consistently in the breakdown
const displayRawRating = (ratingValue, ratingType) => {
    if (ratingValue === undefined || ratingValue === null) return 'Not Rated';
    switch(ratingType) {
        case RATING_TYPE_YES_NO: return ratingValue ? 'Yes' : 'No';
        case RATING_TYPE_SCALE_10: return `${ratingValue}/10`;
        case RATING_TYPE_STARS: default: return `${ratingValue}/5`;
    }
};

function ScoreBreakdown({ ratings, mustHaves, niceToHaves, dealBreakers }) {
    const currentRatings = ratings || {};
    const MAX_NORMALIZED_RATING = 5; // Consistent scale used in calculation

    // --- Recalculate intermediate steps for display ---
    let dealBreakerFailed = null;
    let mustHaveFailed = [];
    let pointsEarned = 0;
    let maxPossiblePoints = 0;
    let niceToHaveDetails = [];

    // Check Deal Breakers
    for (const db of dealBreakers) {
        if (currentRatings[db.id] === true) {
            dealBreakerFailed = db; // Store the first deal breaker found
            break; // No need to check further
        }
    }

    // Check Must-Haves (only if deal breakers passed)
    if (!dealBreakerFailed) {
        for (const mh of mustHaves) {
            if (!currentRatings[mh.id]) {
                mustHaveFailed.push(mh); // Add all failed must-haves
            }
        }
    }

    // Calculate Nice-to-Have details (only if basics passed)
    if (!dealBreakerFailed && mustHaveFailed.length === 0) {
        for (const nth of niceToHaves) {
            const ratingValue = currentRatings[nth.id];
            const weight = nth.weight || 1;
            const ratingType = nth.ratingType || RATING_TYPE_STARS;
            let normalizedRatingValue = 0;

            switch (ratingType) {
                case RATING_TYPE_YES_NO:
                    normalizedRatingValue = ratingValue === true ? MAX_NORMALIZED_RATING : 0;
                    break;
                case RATING_TYPE_SCALE_10:
                    normalizedRatingValue = Math.max(0, Math.min(10, Number(ratingValue) || 0)) / 2;
                    break;
                case RATING_TYPE_STARS: default:
                    normalizedRatingValue = Math.max(0, Math.min(5, Number(ratingValue) || 0));
                    break;
            }

            const itemPoints = normalizedRatingValue * weight;
            const itemMaxPoints = MAX_NORMALIZED_RATING * weight;
            pointsEarned += itemPoints;
            maxPossiblePoints += itemMaxPoints;

            niceToHaveDetails.push({
                ...nth,
                ratingDisplay: displayRawRating(ratingValue, ratingType),
                points: itemPoints,
                maxPoints: itemMaxPoints
            });
        }
    }
    // Recalculate final score just to be safe (should match prop)
    // const calculatedFinalScore = calculateScore(ratings, mustHaves, niceToHaves, dealBreakers); // Already done in parent


    return (
        <div className="score-breakdown">
            <h3>Score Calculation Breakdown</h3>

            {/* 1. Deal Breaker Status */}
            <div className="breakdown-section deal-breakers">
                <h4>Deal Breakers</h4>
                {dealBreakerFailed ? (
                    <p className="status-fail">
                        <i className="fas fa-ban"></i> FAILED: "{dealBreakerFailed.text}" applies. (Score: 0)
                    </p>
                ) : (
                    <p className="status-pass">
                        <i className="fas fa-check-circle"></i> Passed. No deal breakers apply.
                    </p>
                )}
            </div>

            {/* 2. Must-Have Status */}
            {!dealBreakerFailed && ( // Only show if Deal Breakers passed
                <div className="breakdown-section must-haves">
                    <h4>Must-Haves</h4>
                    {mustHaveFailed.length > 0 ? (
                        <div className="status-fail">
                            <p><i className="fas fa-times-circle"></i> FAILED: The following must-haves were not met (Score: 0):</p>
                            <ul>
                                {mustHaveFailed.map(mh => <li key={mh.id}>{mh.text}</li>)}
                            </ul>
                        </div>
                    ) : (
                        <p className="status-pass">
                            <i className="fas fa-check-circle"></i> Passed. All must-haves met.
                        </p>
                    )}
                </div>
            )}

            {/* 3. Nice-to-Have Points */}
            {!dealBreakerFailed && mustHaveFailed.length === 0 && ( // Only show if basics passed
                <div className="breakdown-section nice-to-haves">
                    <h4>Nice-to-Haves</h4>
                    {niceToHaves.length > 0 ? (
                        <>
                            <p>Points Earned: <strong>{pointsEarned.toFixed(1)}</strong> out of <strong>{maxPossiblePoints.toFixed(1)}</strong> possible points.</p>
                            <ul className="nth-details-list">
                                {niceToHaveDetails.map(detail => (
                                    <li key={detail.id}>
                                        <span className="nth-text">{detail.text}</span>
                                        <span className="nth-rating">(Rated: {detail.ratingDisplay})</span>
                                        <span className="nth-weight">[W:{detail.weight}]</span>
                                        <span className="nth-points">-&gt; {detail.points.toFixed(1)} / {detail.maxPoints.toFixed(1)} pts</span>
                                    </li>
                                ))}
                            </ul>
                        </>
                    ) : (
                        <p><i>No nice-to-have criteria defined.</i></p>
                    )}
                </div>
            )}

             {/* 4. Final Score Display (optional reinforcement) */}
             {/* <div className="breakdown-section final-score-summary">
                <h4>Resulting Score</h4>
                <p>Based on the above, the calculated score is <strong>{finalScore ?? '--'}</strong>.</p>
             </div> */}
        </div>
    );
}

export default ScoreBreakdown;