const startButton = document.getElementById("startButton");

startButton.addEventListener("click", function () {

    const playerName = document.getElementById("playerName").value;

    if (playerName.trim() === "") {
        alert("Please enter a nickname!");
        return;
    }

    alert("Welcome to the hunt, " + playerName + " 🏴‍☠️");

});