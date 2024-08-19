import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css'; 

const socket = io('https://nextvibe-backend.onrender.com/'); // Connect to the backend server

function App() {
    const [username, setUsername] = useState('');
    const [partnerUsername, setPartnerUsername] = useState(null);
    const [message, setMessage] = useState('');
    const [chatMessages, setChatMessages] = useState([]);
    const [isConnected, setIsConnected] = useState(false);
    const [isSearching, setIsSearching] = useState(false);

    const messageAreaRef = useRef(null); // Reference for the message area

    useEffect(() => {
        socket.on('connect', () => {
            console.log('Connected to server');
        });

        socket.on('user list', (users) => {
            console.log('Active users:', users);
        });

        socket.on('chat paired', (partnerId) => {
            console.log('Chat paired with:', partnerId);
            setPartnerUsername(partnerId);
            setIsConnected(true);
            setIsSearching(false);
        });

        socket.on('receive message', (data) => {
            setChatMessages((prev) => [...prev, { from: data.username, chat: data.chat }]);
        });

        socket.on('chat ended', () => {
            alert('Chat ended by your partner.');
            setIsConnected(false);
            setPartnerUsername(null);
            setChatMessages([]);
        });

        return () => {
            socket.off('connect');
            socket.off('user list');
            socket.off('chat paired');
            socket.off('receive message');
            socket.off('chat ended');
        };
    }, []);

    useEffect(() => {
        if (messageAreaRef.current) {
            messageAreaRef.current.scrollTop = messageAreaRef.current.scrollHeight;
        }
    }, [chatMessages]);

    const handleStartChat = () => {
        socket.emit('start random chat');
        setIsSearching(true);
    };

    const handleSendMessage = () => {
        if (message.trim() && isConnected) {
            socket.emit('send message', message);
            setMessage('');
        }
    };

    const handleEndChat = () => {
        socket.emit('end chat');
        setIsConnected(false);
        setPartnerUsername(null);
        setChatMessages([]);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault(); // Prevents the default action (e.g., form submission)
            handleSendMessage();
        }
    };

    return (
        <div className="app">
            
            <h1><a href="/nextvibe/" className="logo">NextVibe</a></h1>            

            {!isConnected && !isSearching && (
                <div className="chat-controls">
                    <button onClick={handleStartChat} id='startBtn' className="btn-primary">
                        Start Random Chat
                    </button>
                </div>
            )}

            {isSearching && (
                <div id="searchingMessage">
                    <div className="spinner"></div>
                    <p>Searching for a chat partner...</p>
                </div>
            )}

            {isConnected && (
                <div id="chatInterface">
                    <div id="messageArea" ref={messageAreaRef}>
                        {chatMessages.map((msg, index) => (
                            <div
                                key={index}
                                className={`message ${msg.from === 'You' ? 'sent' : 'received'}`}
                            >
                                <strong>{msg.from}: </strong>{msg.chat}
                            </div>
                        ))}
                    </div>

                    <div className="input-wrapper">
                        <input
                            type="text"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            onKeyDown={handleKeyDown} // Add onKeyDown event
                            placeholder="Type a message..."
                        />
                        <div className="button-group">
                            <button onClick={handleSendMessage} className="btn-primary">
                                Send
                            </button>
                            <button onClick={handleEndChat} className="btn-danger">
                                End Chat
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;