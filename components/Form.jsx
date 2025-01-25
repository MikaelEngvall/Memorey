import { useState } from 'react';
import io from 'socket.io-client';
import RegularButton from './RegularButton';
import Select from './Select';

const socket = io('http://localhost:3000');

export default function Form({ handleSubmit, handleChange }) {
    const [roomCode, setRoomCode] = useState('');
    const [isRoomCreated, setIsRoomCreated] = useState(false);

    const createRoom = () => {
        socket.emit('createRoom', (code) => {
            setRoomCode(code);
            setIsRoomCreated(true);
        });
    };

    const joinRoom = () => {
        socket.emit('joinRoom', roomCode, (success) => {
            if (success) {
                alert('Joined room successfully');
            } else {
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