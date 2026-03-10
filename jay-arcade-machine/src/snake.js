// Class adapted from https://gist.github.com/straker/ff00b4b49669ad3dec890306d348adc4
class SnakeGame {
  constructor() {
    this.canvas = document.getElementById("game");
    this.currentScoreElement = document.getElementById("currentScore");
    this.maxScoreElement = document.getElementById("maxScore");
    this.currentScoreElement.style.display = "block";
    this.maxScoreElement.style.display = "block";
    this.currentScore = 0;
    this.updateScore();
    this.canvas.style.display = "block";
    this.context = this.canvas.getContext("2d");
    this.keyDownAllowed = true;
    this.keysPressedQueue = [];
    this.grid = 32;
    this.numCellsW = this.canvas.width / this.grid;
    this.numCellsH = this.canvas.height / this.grid;
    this.snake = {
      x: 160,
      y: 160,
      dx: this.grid,
      dy: 0,
      cells: [],
      maxCells: 4,
    };
    this.apple = {
      x: 320,
      y: 320,
    };
    this.loopInterval = 50;
    this.loopId = null;
  }

  // get random whole numbers in a specific range
  // @see https://stackoverflow.com/a/1527820/2124254
  getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  }

  loop = () => {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.snake.x += this.snake.dx;
    this.snake.y += this.snake.dy;

    if (this.snake.x < 0) {
      this.snake.x = this.canvas.width - this.grid;
    } else if (this.snake.x >= this.canvas.width) {
      this.snake.x = 0;
    }

    if (this.snake.y < 0) {
      this.snake.y = this.canvas.height - this.grid;
    } else if (this.snake.y >= this.canvas.height) {
      this.snake.y = 0;
    }

    this.snake.cells.unshift({ x: this.snake.x, y: this.snake.y });

    if (this.snake.cells.length > this.snake.maxCells) {
      this.snake.cells.pop();
    }

    this.context.fillStyle = "#ff0000";
    this.context.beginPath();
    this.context.arc(
      this.apple.x + this.grid / 2,
      this.apple.y + this.grid / 2,
      12,
      0,
      2 * Math.PI
    );
    this.context.fill();

    this.context.fillStyle = "#35de00";
    this.snake.cells.forEach((cell, index) => {
      this.context.fillRect(cell.x, cell.y, this.grid - 1, this.grid - 1);

      if (cell.x === this.apple.x && cell.y === this.apple.y) {
        window.parent.postMessage("hit", "*");
        this.snake.maxCells++;
        this.apple.x = this.getRandomInt(0, this.numCellsW) * this.grid;
        this.apple.y = this.getRandomInt(0, this.numCellsH) * this.grid;
        this.currentScore += 10;
        this.updateScore();
      }

      for (let i = index + 1; i < this.snake.cells.length; i++) {
        if (
          cell.x === this.snake.cells[i].x &&
          cell.y === this.snake.cells[i].y
        ) {
          window.parent.postMessage("die", "*");
          this.currentScore = 0;
          this.updateScore();
          this.snake.x = 160;
          this.snake.y = 160;
          this.snake.cells = [];
          this.snake.maxCells = 4;
          this.snake.dx = this.grid;
          this.snake.dy = 0;

          this.apple.x = this.getRandomInt(0, this.numCellsW) * this.grid;
          this.apple.y = this.getRandomInt(0, this.numCellsH) * this.grid;
        }
      }
    });
  };

  listenKeyboard() {
    window.addEventListener("message", this.handleParentMessage);
    window.addEventListener("keydown", this.keyListener);
  }

  handleParentMessage = (event) => {
    if (event.data.type === "keyDownParent") {
      this.keyListener(event.data);
    }
  };

  keyListener = (e) => {
    if (!this.keyDownAllowed) {
      this.keysPressedQueue.push(e);
      return;
    }
    this.processKeyEvent(e);
    this.keyDownAllowed = false;
    setTimeout(() => {
      this.keyDownAllowed = true;
      while (this.keysPressedQueue.length > 0) {
        const keyEvent = this.keysPressedQueue.shift();
        this.processKeyEvent(keyEvent);
      }
    }, this.loopInterval);
  };

  updateScore() {
    let maxScore = localStorage.getItem("maxSnakeScore") || 0;
    if (this.currentScore > maxScore) {
      maxScore = this.currentScore;
      localStorage.setItem("maxSnakeScore", this.currentScore);
    }
    this.currentScoreElement.textContent =
      "CURRENT SCORE: " + this.currentScore;

    this.maxScoreElement.textContent = "MAX SCORE: " + maxScore;
  }
  processKeyEvent(e) {
    if (e.key === "ArrowLeft" && this.snake.dx === 0) {
      this.snake.dx = -this.grid;
      this.snake.dy = 0;
    }
    // up arrow key
    else if (e.key === "ArrowUp" && this.snake.dy === 0) {
      this.snake.dy = -this.grid;
      this.snake.dx = 0;
    }
    // right arrow key
    else if (e.key === "ArrowRight" && this.snake.dx === 0) {
      this.snake.dx = this.grid;
      this.snake.dy = 0;
    }
    // down arrow key
    else if (e.key === "ArrowDown" && this.snake.dy === 0) {
      this.snake.dy = this.grid;
      this.snake.dx = 0;
    }
  }

  start() {
    this.listenKeyboard();
    this.loopId = setInterval(this.loop, this.loopInterval);
  }

  destroy() {
    this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    clearInterval(this.loopId);
    window.removeEventListener("message", this.handleParentMessage);
    this.canvas.style.display = "none";
  }
}

export default SnakeGame;
