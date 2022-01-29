import express from 'express';
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import { createServer } from 'http';
import { Server } from 'socket.io'
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, { path: '/ws/', transports: ['websocket'], cors: { origin: "*" } });

const pubClient = createClient({ url: "redis://localhost:6379" });
const subClient = pubClient.duplicate();
app.use(express.static('public'));


const users = new Map();
const messages = new Map();

const getMessageByUser = (id: number) => {
    let msg = [];

    for (let [_, message] of messages) {
        if (message.to.id == id || message.from.id == id) {
            msg.push(message);
        }
    }

    return msg;
}

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    io.on("connection", (socket) => {
        socket.on('login', (data, callback) => {
            if (!users.has(data.username)) {
                users.set(data.username, data);
                data.id = Date.now();
            } else {
                data = users.get(data.username);
            }

            callback({ success: true, user: data });
            io.emit('users', { users: Array.from(users.values()) });
            io.emit('messages', { messages: getMessageByUser(data.id) || [] });
            socket.join(data.id);
        });

        socket.on('logout', (data, callback) => {
            users.delete(data.user.id);
            io.emit('users', { users: Array.from(users.values()) });
            callback({ success: true });
        });

        socket.on('chat', (data, callback) => {
            socket.to(data.to.id).emit('chat', { message: data });
            callback({ success: true, message: data })
            messages.set(data.id, data);
        });
    });

    const port = process.argv[2] || 3000;
    httpServer.listen(port, () => {
        console.log(`listening on port ${port}`, process.pid);
    });
});