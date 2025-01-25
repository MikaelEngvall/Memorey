import { useState, useEffect } from 'react';
import io from 'socket.io-client';
import RegularButton from './RegularButton';
import Select from './Select';

const socket = io('http://localhost:3000');

export default function Form({ handleSubmit, handleChange }) {
    const [roomCode, setRoomCode] = useState('');
    const [isRoomCreated, setIsRoomCreated] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState('Disconnected');

    useEffect(() => {
        socket.on('connect', () => {
            console.log('Connected to socket server');
            setConnectionStatus('Connected');
        });

        socket.on('disconnect', () => {
            console.log('Disconnected from socket server');
            setConnectionStatus('Disconnected');
        });

        socket.on('roomJoined', (roomCode) => {
            console.log(`Joined room: ${roomCode}`);
            alert(`Joined room: ${roomCode}`);
        });

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('roomJoined');
        };
    }, []);

    const createRoom = () => {
        socket.emit('createRoom', (code) => {
            console.log('Room created with code:', code);
            setRoomCode(code);
            setIsRoomCreated(true);
        });
    };

    const joinRoom = () => {
        console.log('Attempting to join room with code:', roomCode);
        socket.emit('joinRoom', roomCode, (success) => {
            if (success) {
                console.log('Joined room successfully');
                alert('Joined room successfully');
            } else {
                console.log('Room not found');
                alert('Room not found');
            }
        });
    };

    return (
        <div className="form-container">
            <p className="p--regular">
                Customize the game by selecting an emoji category and a number of memory cards.
            </p>
            <form className="wrapper">
                <Select handleChange={handleChange} />
                <RegularButton handleClick={handleSubmit}>
                    Start Game
                </RegularButton>
            </form>
            <div className="room-container">
                <p>Connection Status: {connectionStatus}</p>
                {isRoomCreated ? (
                    <p>Room Code: {roomCode}</p>
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