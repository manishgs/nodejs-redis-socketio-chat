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

Promise.all([pubClient.connect(), subClient.connect()]).then(() => {
    io.adapter(createAdapter(pubClient, subClient));
    io.on("connection", (socket) => {
        socket.on("message", (message) => {
            console.log(message)
        });
    });

    const port = process.argv[2] || 3000;
    httpServer.listen(port, () => {
        console.log(`listening on port ${port}`, process.pid);
    });
});