import { Server } from 'socket.io';
const io = new Server(3001);
export default io;

io.on('connection', client => {
    console.log('connected!');
    client.emit('connected!');
});
