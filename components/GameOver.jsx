import { useRef, useEffect } from 'react'
import RegularButton from './RegularButton'

export default function GameOver({ handleClick, attempts, playerScores }) {
    const divRef = useRef(null)
    
    useEffect(() => {
        divRef.current.focus()
    }, [])
    
    const winner = playerScores.indexOf(Math.max(...playerScores))
    
    return (
        <div
            className="wrapper wrapper--accent"
            tabIndex={0}
            ref={divRef}
        >
            <p className="p--large">Game Over!</p>
            
            {playerScores.length > 1 ? (
                <>
                    <p className="p--regular">
                        Winner: Player {winner + 1} with {playerScores[winner]} pairs!
                    </p>
                    <div className="scores-container">
                        {playerScores.map((score, index) => (
                            <p key={index} className="p--regular">
                                Player {index + 1}: {score} pairs
                            </p>
                        ))}
                    </div>
                </>
            ) : (
                <p className="p--regular">
                    You matched all pairs in {attempts} attempts!
                </p>
            )}
            
            <RegularButton handleClick={handleClick}>
                Play again
            </RegularButton>
        </div>
    )
}