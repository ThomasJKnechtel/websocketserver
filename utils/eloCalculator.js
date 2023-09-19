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
      return {playerA: K * (1 - Pa), playerB: K * (0 - Pb)};
    }
    // Case 2: Player B wins
    else if (result === 'B') {
      Ra = Ra + K * (0 - Pa);
      Rb = Rb + K * (1 - Pb);
      return {playerA: K * (0 - Pa), playerB: K * (1 - Pb)}
    }
    // Case 3: Draw
    else if (result === 'draw') {
      return {playerA: K*(0.5 - Pa), playerB: K * (0.5 - Pb)}
    }
  }
  
module.exports = EloChange