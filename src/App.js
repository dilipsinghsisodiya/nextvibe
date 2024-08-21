const express = require('express');
const session = require('express-session');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');
const http = require('http');
const path = require('path');
const cors = require('cors');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "https://nextvibe-backend.onrender.com/",
        methods: ["GET", "POST"],
        credentials: true
    }
});
const port = 5000;


app.use(cookieParser());
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));

app.use(cors({
    origin: "https://nextvibe-backend.onrender.com/",
    credentials: true
}));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

let users = new Map();
let waitingUsers = {
    chat: [],
    call: [],
    video: []
};

function generateRandomUsername(socketId) {
    return `User_${socketId.substring(0, 5)}_${Math.floor(Math.random() * 1000)}`;
}

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    const randomUsername = generateRandomUsername(socket.id);
    users.set(socket.id, { username: randomUsername, pairedWith: null, interactionType: null });
    io.emit('user list', Array.from(users.values()).map(user => user.username));

    socket.on('start interaction', (interactionType) => {
        console.log(`${socket.id} started ${interactionType}`);

        if (!users.has(socket.id)) return;

        if (!waitingUsers[interactionType].includes(socket.id)) {
            waitingUsers[interactionType].push(socket.id);

            if (waitingUsers[interactionType].length >= 2) {
                const user1 = waitingUsers[interactionType].shift();
                const user2 = waitingUsers[interactionType].shift();

                pairUsers(user1, user2, interactionType);
            }
        }
    });

    socket.on('send message', (chat) => {
        const user = users.get(socket.id);
        if (user && user.pairedWith) {
            io.to(user.pairedWith).emit('receive message', { username: user.username, chat });
            io.to(socket.id).emit('receive message', { username: 'You', chat });
        }
    });

    socket.on('end interaction', () => {
        console.log('User ended interaction:', socket.id);
        const user = users.get(socket.id);

        if (user && user.pairedWith) {
            io.to(user.pairedWith).emit('interaction ended');
            const pairedUser = users.get(user.pairedWith);
            if (pairedUser) {
                pairedUser.pairedWith = null;
            }
            user.pairedWith = null;
        }

        for (const type in waitingUsers) {
            waitingUsers[type] = waitingUsers[type].filter(id => id !== socket.id);
        }

        io.emit('user list', Array.from(users.values()).map(user => user.username));
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        const user = users.get(socket.id);

        if (user) {
            if (user.pairedWith) {
                io.to(user.pairedWith).emit('interaction ended');
                const pairedUser = users.get(user.pairedWith);
                if (pairedUser) {
                    pairedUser.pairedWith = null;
                }
            }

            for (const type in waitingUsers) {
                waitingUsers[type] = waitingUsers[type].filter(id => id !== socket.id);
            }

            users.delete(socket.id);
            io.emit('user list', Array.from(users.values()).map(user => user.username));
        }
    });

    socket.on('signal', (data) => {
        io.to(data.to).emit('signal', { from: socket.id, signal: data.signal });
    });
});

function pairUsers(user1Id, user2Id, interactionType) {
    users.get(user1Id).pairedWith = user2Id;
    users.get(user2Id).pairedWith = user1Id;
    users.get(user1Id).interactionType = interactionType;
    users.get(user2Id).interactionType = interactionType;

    io.to(user1Id).emit(`${interactionType} paired`, user2Id);
    io.to(user2Id).emit(`${interactionType} paired`, user1Id);
}

server.listen(port, () => {
    console.log(`Server is listening at the port: ${port}`);
});
