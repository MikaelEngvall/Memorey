import { useState, useEffect } from 'react'
import Form from '/components/Form'
import MemoryCard from '/components/MemoryCard'
import AssistiveTechInfo from '/components/AssistiveTechInfo'
import GameOver from '/components/GameOver'
import GameStatus from './components/GameStatus'
import ErrorCard from '/components/ErrorCard'

export default function App() {
    const initialFormData = {
        category: "animals-and-nature", 
        number: 10,
        players: "1"  // Add players to initial form data
    }
    
    const [formData, setFormData] = useState(initialFormData)
    const [isGameOn, setIsGameOn] = useState(false)
    const [emojisData, setEmojisData] = useState([])
    const [selectedCards, setSelectedCards] = useState([])
    const [matchedCards, setMatchedCards] = useState([])
    const [areAllCardsMatched, setAreAllCardsMatched] = useState(false)
    const [isError, setIsError] = useState(false)
    const [attempts, setAttempts] = useState(0)  // Add attempts state
    const [timeElapsed, setTimeElapsed] = useState(0)
    const [isTimerActive, setIsTimerActive] = useState(false)
    const [bestScore, setBestScore] = useState(
        JSON.parse(localStorage.getItem('bestScore')) || {}
    )
    const [currentPlayer, setCurrentPlayer] = useState(0)
    const [playerScores, setPlayerScores] = useState([])
    const [isLoading, setIsLoading] = useState(false)
    const [ws, setWs] = useState(null);
    const [roomCode, setRoomCode] = useState('');

    // Add attempt counter when two cards are selected
    useEffect(() => {
        if (selectedCards.length === 2) {
            setAttempts(prev => prev + 1)
            // Check for match
            if (selectedCards[0].name === selectedCards[1].name) {
                setPlayerScores(prev => {
                    const newScores = [...prev]
                    newScores[currentPlayer]++
                    return newScores
                })
            } else {
                // Switch to next player if no match
                setCurrentPlayer(prev => 
                    (prev + 1) % parseInt(formData.players)
                )
            }
        }
    }, [selectedCards])

    useEffect(() => {
        if (selectedCards.length === 2 && selectedCards[0].name === selectedCards[1].name) {
            setMatchedCards(prevMatchedCards => [...prevMatchedCards, ...selectedCards])
        }
    }, [selectedCards])
    
    useEffect(() => {
        if (emojisData.length && matchedCards.length === emojisData.length) {
            setAreAllCardsMatched(true)
            setIsTimerActive(false)
        }
    }, [matchedCards, emojisData])

    useEffect(() => {
        let interval
        if (isGameOn && !areAllCardsMatched) {
            setIsTimerActive(true)
            interval = setInterval(() => {
                setTimeElapsed(time => time + 1)
            }, 1000)
        }
        return () => {
            clearInterval(interval)
            setIsTimerActive(false)
        }
    }, [isGameOn, areAllCardsMatched])

    useEffect(() => {
        const websocket = new WebSocket('ws://localhost:3000/ws');
        
        websocket.onmessage = async (event) => {
            const data = JSON.parse(event.data);
            console.log('App received:', data);
            
            switch(data.type) {
                case 'gameStarted':
                    console.log('Game starting with data:', data);
                    setFormData(data.gameData);
                    setEmojisData(data.emojisData);
                    setCurrentPlayer(data.currentPlayer);
                    setPlayerScores(data.playerScores);
                    setSelectedCards(data.selectedCards || []);
                    setMatchedCards(data.matchedCards || []);
                    setIsGameOn(true);
                    break;

                case 'cardFlipped':
                    console.log('Card flipped:', data.selectedCards);
                    setSelectedCards(data.selectedCards);
                    break;

                case 'turnComplete':
                    setCurrentPlayer(data.currentPlayer);
                    setPlayerScores(data.playerScores);
                    if (data.matchedCards) {
                        setMatchedCards(data.matchedCards);
                    }
                    setSelectedCards([]);
                    break;
            }
        };

        websocket.onerror = (error) => {
            console.error('WebSocket error:', error);
        };

        websocket.onclose = () => {
            console.log('WebSocket closed');
        };

        setWs(websocket);
        
        // Only close when component unmounts
        return () => {
            if (websocket.readyState === WebSocket.OPEN) {
                websocket.close();
            }
        };
    }, []); // Empty dependency array to run only once
    
    function handleFormChange(e) {
        setFormData(prevFormData => ({...prevFormData, [e.target.name]: e.target.value}))
    }
    
    async function startGame(e) {
        e.preventDefault();
        setIsLoading(true);
        try {
            setTimeElapsed(0);
            setCurrentPlayer(0);
            setPlayerScores(new Array(parseInt(formData.players)).fill(0));
            
            let data;
            
            switch(formData.category) {
                case 'pokemon':
                    data = await fetchPokemonData()
                    break;
                case 'dogs':
                    data = await fetchDogData()
                    break;
                case 'rickandmorty':
                    data = await fetchRickAndMortyData()
                    break;
                default:
                    const response = await fetch(`https://emojihub.yurace.pro/api/all/category/${formData.category}`)
                    if (!response.ok) throw new Error("Could not fetch data from API")
                    data = await response.json()
            }

            const dataSlice = await getDataSlice(data)
            const cardsArray = await getEmojisArray(dataSlice)
            
            if (ws && roomCode) {
                ws.send(JSON.stringify({
                    type: 'startGame',
                    roomCode: roomCode,
                    gameData: formData,
                    emojisData: cardsArray
                }));
            }
            
            setEmojisData(cardsArray)
            setIsGameOn(true)
        } catch(err) {
            console.error(err);
            setIsError(true);
        } finally {
            setIsLoading(false);
        }   
    }

    async function fetchPokemonData() {
        const pokemonIds = new Set()
        while(pokemonIds.size < formData.number/2) {
            pokemonIds.add(Math.floor(Math.random() * 898) + 1)
        }
        
        const promises = [...pokemonIds].map(id => 
            fetch(`https://pokeapi.co/api/v2/pokemon/${id}`)
                .then(res => res.json())
        )
        
        const pokemonData = await Promise.all(promises)
        return pokemonData.map(pokemon => ({
            name: pokemon.name,
            htmlCode: [pokemon.sprites.front_default],
            type: 'image'
        }))
    }

    async function fetchDogData() {
        const response = await fetch(`https://dog.ceo/api/breeds/image/random/${formData.number/2}`)
        const data = await response.json()
        return data.message.map((url, index) => ({
            name: `dog${index}`,
            htmlCode: [url],
            type: 'image'
        }))
    }

    async function fetchRickAndMortyData() {
        const maxChar = 826
        const charIds = new Set()
        while(charIds.size < formData.number/2) {
            charIds.add(Math.floor(Math.random() * maxChar) + 1)
        }
        
        const response = await fetch(`https://rickandmortyapi.com/api/character/${[...charIds]}`)
        const data = await response.json()
        return data.map(char => ({
            name: char.name,
            htmlCode: [char.image],
            type: 'image'
        }))
    }

    async function getDataSlice(data) {
        const randomIndices = getRandomIndices(data)
        
        const dataSlice = randomIndices.reduce((array, index) => {
            array.push(data[index])
            return array
        }, [])

        return dataSlice
    }

    function getRandomIndices(data) {        
        const randomIndicesArray = []
 
        for (let i = 0; i < (formData.number / 2); i++) {
            const randomNum = Math.floor(Math.random() * data.length)
            if (!randomIndicesArray.includes(randomNum)) {
                randomIndicesArray.push(randomNum)
            } else {
                i--
            }
        }
        
        return randomIndicesArray
    }

    async function getEmojisArray(data) {
        const pairedEmojisArray = [...data, ...data]
        
        for (let i = pairedEmojisArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1))
            const temp = pairedEmojisArray[i]
            pairedEmojisArray[i] = pairedEmojisArray[j]
            pairedEmojisArray[j] = temp
        }
        
        return pairedEmojisArray
    }
    
    function turnCard(name, index) {
        if (ws && roomCode) {
            const isMyTurn = currentPlayer === 0; // This should be based on player index
            const isAlreadySelected = selectedCards.some(card => card.index === index);
            const isAlreadyMatched = matchedCards.some(card => card.index === index);
            
            if (isMyTurn && !isAlreadySelected && !isAlreadyMatched && selectedCards.length < 2) {
                const newSelectedCards = [...selectedCards, { name, index }];
                console.log('Sending turnCard:', newSelectedCards);
                
                ws.send(JSON.stringify({
                    type: 'turnCard',
                    roomCode: roomCode,
                    card: { name, index },
                    selectedCards: newSelectedCards,
                }));
            }
        }
    }
    
    // Reset game function should clear attempts
    function resetGame() {
        setIsGameOn(false)
        setSelectedCards([])
        setMatchedCards([])
        setAreAllCardsMatched(false)
        setAttempts(0)
        setTimeElapsed(0)
        setCurrentPlayer(0)
        setPlayerScores([])
    }
    
    function resetError() {
        setIsError(false)
    }
    
    return (
        <main>
            <h1>Memory</h1>
            {!isGameOn && !isError &&
                <Form 
                    handleSubmit={startGame} 
                    handleChange={handleFormChange}
                    formData={formData}
                    setRoomCode={setRoomCode}  // Add this prop
                />
            }
            {isLoading && <p>Loading game...</p>}
            {isGameOn && !areAllCardsMatched && !isLoading &&
                <div className="game-container">
                    <AssistiveTechInfo 
                        emojisData={emojisData} 
                        matchedCards={matchedCards} 
                    />
                    <GameStatus 
                        emojisData={emojisData} 
                        matchedCards={matchedCards}
                        attempts={attempts}
                        timeElapsed={timeElapsed}
                        currentPlayer={currentPlayer}
                        playerScores={playerScores || []}
                    />
                    <MemoryCard
                        handleClick={turnCard}
                        data={emojisData}
                        selectedCards={selectedCards}
                        matchedCards={matchedCards}
                    />
                </div>
            }
            {areAllCardsMatched && 
                <GameOver 
                    handleClick={resetGame} 
                    attempts={attempts}
                    playerScores={playerScores}
                />
            }
            {isError && <ErrorCard handleClick={resetError} />}
        </main>
    )
}