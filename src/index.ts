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

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    io.on("connection", (socket) => {
        socket.on('login', (data, callback) => {
            data.id = Date.now();
            users.set(data.id, data);
            callback({ success: true, user: data });
            io.emit('users', { users: Array.from(users.values()) });
            socket.join(data.id);
        });

        socket.on('logout', (data, callback) => {
            users.delete(data.user.id);
            io.emit('users', { users: Array.from(users.values()) });
            callback({ success: true });
        });
    });

    const port = process.argv[2] || 3000;
    httpServer.listen(port, () => {
        console.log(`listening on port ${port}`, process.pid);
    });
});