function Probability(rating1, rating2) {
    return (
      (1.0 * 1.0) / (1 + 1.0 * Math.pow(10, (1.0 * (rating1 - rating2)) / 400))
    );
  }
  
  function EloChange(Ra, Rb, K, result) {
    let Pa = Probability(Rb, Ra);
    let Pb = Probability(Ra, Rb);
  
    // Case 1: Player A wins
    if (result === 'A') {
      return {A: Math.floor(K * (1 - Pa)), B: Math.floor(K * (0 - Pb))};
    }
    // Case 2: Player B wins
    else if (result === 'B') {
      Ra = Ra + K * (0 - Pa);
      Rb = Rb + K * (1 - Pb);
      return {A: Math.floor(K * (0 - Pa)), B: Math.floor(K * (1 - Pb))}
    }
    // Case 3: Draw
    else if (result === 'DRAW') {
      return {A: Math.floor(K*(0.5 - Pa)),B: Math.floor(K * (0.5 - Pb))}
    }
    return {A: 0, B: 0} 
  }
  
module.exports = EloChange