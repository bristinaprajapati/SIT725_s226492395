const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

// In-memory store for vote counts
const pollData = {
    OptionA: 0,
    OptionB: 0
};

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Send the current vote totals to the newly connected client
    socket.emit('updateVotes', pollData);

    // Listen for incoming votes from clients
    socket.on('castVote', (option) => {
        if (pollData.hasOwnProperty(option)) {
            pollData[option]++;
            console.log(`Vote received for ${option}. Current counts:`, pollData);
            // Broadcast the updated vote count to ALL connected clients
            io.emit('updateVotes', pollData);
        }
    });

    socket.on('disconnect', () => {
        console.log('Client disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});