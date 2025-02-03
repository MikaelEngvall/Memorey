import { useState, useEffect } from 'react';
import RegularButton from './RegularButton';
import Select from './Select';

export default function Form({ handleSubmit, handleChange, formData }) {  // Add formData prop
    const [roomCode, setRoomCode] = useState('');
    const [isRoomCreated, setIsRoomCreated] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('Disconnected');
    const [ws, setWs] = useState(null);
    const [players, setPlayers] = useState([]); // Initialize as empty array
    const [playerName, setPlayerName] = useState(`Player ${Math.floor(Math.random() * 1000)}`);

    const startGame = (e) => {
        e.preventDefault();
        if (ws && roomCode) {
            ws.send(JSON.stringify({
                type: 'startGame',
                roomCode: roomCode,
                gameData: formData,  // Now formData is available from props
                emojisData: [] // This will be filled by the host's game initialization
            }));
        }
        handleSubmit(e);
    };

    useEffect(() => {
        const websocket = new WebSocket('ws://localhost:3000/ws');
        
        websocket.onopen = () => {
            console.log('Connected to WebSocket server');
            setConnectionStatus('Connected');
            setWs(websocket);
        };

        websocket.onclose = () => {
            console.log('Disconnected from WebSocket server');
            setConnectionStatus('Disconnected');
        };

        websocket.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log('Received message:', data); // Debug log
            
            switch(data.type) {
                case 'roomCreated':
                    console.log('Room created with code:', data.roomCode);
                    setRoomCode(data.roomCode);
                    setIsRoomCreated(true);
                    setPlayers(data.players || []); // Ensure players is an array
                    break;
                case 'roomJoined':
                    if (data.success) {
                        console.log(`Joined room: ${data.roomCode}`);
                        setPlayers(data.players || []); // Ensure players is an array
                        setIsRoomCreated(true);
                    } else {
                        console.log('Room not found');
                        alert('Room not found');
                    }
                    break;
                case 'roomUpdate':
                    setPlayers(data.players || []); // Ensure players is an array
                    break;
                case 'gameStarted':
                    console.log('Game started!', data.gameData);
                    handleSubmit(new Event('submit'));
                    break;
            }
        };

        return () => {
            if (websocket) {
                websocket.close();
            }
        };
    }, []);

    const createRoom = () => {
        if (ws) {
            ws.send(JSON.stringify({ type: 'createRoom' }));
        }
    };

    const joinRoom = () => {
        if (ws) {
            console.log('Attempting to join room with code:', roomCode);
            ws.send(JSON.stringify({ 
                type: 'joinRoom',
                roomCode: roomCode,
                playerName: playerName
            }));
        }
    };

    return (
        <div className="form-container">
            <p className="p--regular">
                Customize the game by selecting an emoji category and a number of memory cards.
            </p>
            <form className="wrapper">
                <Select handleChange={handleChange} />
                <RegularButton handleClick={startGame}>  {/* Changed from handleSubmit to startGame */}
                    Start Game
                </RegularButton>
            </form>
            <div className="room-container">
                <p>Connection Status: {connectionStatus}</p>
                
                <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    placeholder="Enter your name"
                    className="player-name-input"
                />
                
                {isRoomCreated ? (
                    <>
                        <p>Room Code: {roomCode}</p>
                        <div className="players-list">
                            <h3>Players in Room:</h3>
                            {Array.isArray(players) && players.length > 0 ? (
                                <ul>
                                    {players.map((player, index) => (
                                        <li key={index}>{player}</li>
                                    ))}
                                </ul>
                            ) : (
                                <p>No players in room yet</p>
                            )}
                        </div>
                    </>
                ) : (
                    <RegularButton handleClick={createRoom}>
                        Create Room
                    </RegularButton>
                )}
                <input
                    type="text"
                    value={roomCode}
                    onChange={(e) => setRoomCode(e.target.value)}
                    placeholder="Enter room code"
                />
                <RegularButton handleClick={joinRoom}>
                    Join Room
                </RegularButton>
            </div>
        </div>
    );
}