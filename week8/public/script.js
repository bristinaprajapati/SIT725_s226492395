const socket = io();

// Function to send the selected vote option to the server
function vote(option) {
    socket.emit('castVote', option);
}

// Listen for updated vote data broadcasted by the server
socket.on('updateVotes', (data) => {
    document.getElementById('countA').innerText = data.OptionA;
    document.getElementById('countB').innerText = data.OptionB;
});