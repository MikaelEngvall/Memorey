export default function GameStatus({ 
    emojisData, 
    matchedCards, 
    currentPlayer,
    playerScores 
}) {
    if (!emojisData || !matchedCards || !playerScores) return null
    
    return (
        <section className="game-status">
            <div className="status-grid">
                {playerScores.length > 1 && (
                    <>
                        <div className="status-item">
                            <h3>Current Turn</h3>
                            <span className="animate-number">Player {currentPlayer + 1}</span>
                        </div>
                        <div className="status-item">
                            <h3>Your Score</h3>
                            <span className="animate-number">{playerScores[currentPlayer]}</span>
                        </div>
                    </>
                )}
                {playerScores.map((score, index) => (
                    <div key={index} className="status-item">
                        <h3>Player {index + 1}</h3>
                        <span className="animate-number">{score}</span>
                    </div>
                ))}
                <div className="status-item">
                    <h3>Pairs Found</h3>
                    <span className="animate-number">{matchedCards.length / 2}</span>
                </div>
            </div>
        </section>
    )
}