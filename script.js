let cachedMaze = null;
let cachedWidth = 10;
let cachedHeight = 10;
let cachedRemoveDeadEnds = false;

// Helper to check if opening a wall would create a 2x2 open room
function creates2x2Room(maze, x, y, dir) {
    const width = maze[0].length, height = maze.length;
    const dx = [0, 1, 0, -1];
    const dy = [-1, 0, 1, 0];
    const nx = x + dx[dir], ny = y + dy[dir];

    // Check all 2x2 blocks that would be affected
    const blocks = [];
    if (dir === 0 || dir === 2) { // vertical
        blocks.push([[x, y], [nx, ny], [nx+1, ny], [x+1, y]]);
        blocks.push([[x, y], [nx, ny], [nx-1, ny], [x-1, y]]);
    } else if (dir === 1 || dir === 3) { // horizontal
        blocks.push([[x, y], [nx, ny], [nx, ny+1], [x, y+1]]);
        blocks.push([[x, y], [nx, ny], [nx, ny-1], [x, y-1]]);
    }

    for (const block of blocks) {
        // Only check blocks fully inside the maze
        if (block.every(([chx, chy]) => chx >= 0 && chx < width && chy >= 0 && chy < height)) {
            // Count open walls between all adjacent cells in the block
            let open = 0;
            // Skip first wall check (because it's the one that we want to open)
            for (let i = 1; i < 4; i++) {
                const j = (i + 1) % 4;
                const [ax, ay] = block[i], [bx, by] = block[j];
                let dirA = -1, dirB = -1;
                if (ax === bx) {
                    dirA = ay < by ? 2 : 0;
                    dirB = ay < by ? 0 : 2;
                } else {
                    dirA = ax < bx ? 1 : 3;
                    dirB = ax < bx ? 3 : 1;
                }
                if (!maze[ay][ax].walls[dirA] && !maze[by][bx].walls[dirB]) open++;
            }
            if (open === 3) return true; // Would create a 2x2 open room
        }
    }
    return false;
}

// Remove dead ends without creating 2x2 rooms
function removeMazeDeadEnds(maze) {
    const width = maze[0].length, height = maze.length;
    let changed = true;
    while (changed) {
        changed = false;
        const deadEnds = [];
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const cell = maze[y][x];
                let openCount = 0;
                for (let dir = 0; dir < 4; dir++) {
                    if (!cell.walls[dir]) openCount++;
                }
                if (openCount === 1) deadEnds.push({x, y});
            }
        }
        for (const {x, y} of deadEnds) {
            const cell = maze[y][x];
            // Try to open a wall that does not create a 2x2 room
            let opened = false;
            for (let dir = 0; dir < 4; dir++) {
                if (cell.walls[dir]) {
                    const nx = x + [0, 1, 0, -1][dir];
                    const ny = y + [-1, 0, 1, 0][dir];
                    // Prevent opening border walls
                    if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
                    if (!creates2x2Room(maze, x, y, dir)) {
                        cell.walls[dir] = false;
                        maze[ny][nx].walls[(dir + 2) % 4] = false;
                        changed = true;
                        opened = true;
                        break; // Only open one wall per dead end per pass
                    }
                }
            }
            // If no wall can be safely opened, leave the dead end
        }
    }
}

function hasOpen2x2Room(maze) {
    const width = maze[0].length, height = maze.length;
    for (let y = 0; y < height - 1; y++) {
        for (let x = 0; x < width - 1; x++) {
            // Check if all four cells are connected (no wall between any pair)
            let open = 0;
            
            // 2x2 inner top wall
            if (!maze[y][x].walls[1] && !maze[y][x+1].walls[3]) open++;
            // 2x2 inner right wall
            if (!maze[y][x+1].walls[2] && !maze[y+1][x+1].walls[0]) open++;
            // 2x2 inner bottom wall
            if (!maze[y+1][x].walls[1] && !maze[y+1][x+1].walls[3]) open++;
            // 2x2 inner left wall
            if (!maze[y][x].walls[2] && !maze[y+1][x].walls[0]) open++;

            if (open === 4) return true;
        }
    }
    return false;
}

function generateMaze(width, height, entranceExit, removeDeadEnds = false) {
    let maze, tries = 0;
    do {
        maze = Array.from({length: height}, () =>
            Array.from({length: width}, () => ({
                visited: false,
                walls: [true, true, true, true],
                runLength: [0, 0, 0, 0] // For each direction, how long the current run is
            }))
        );
        const stack = [];
        let current = {x: 0, y: 0};
        maze[0][0].visited = true;
        stack.push(current);

        const dx = [0, 1, 0, -1];
        const dy = [-1, 0, 1, 0];

        while (stack.length) {
            const {x, y} = current;
            const neighbors = [];
            for (let dir = 0; dir < 4; dir++) {
                const nx = x + dx[dir], ny = y + dy[dir];
                if (
                    nx >= 0 && nx < width &&
                    ny >= 0 && ny < height &&
                    !maze[ny][nx].visited
                ) {
                    neighbors.push({nx, ny, dir});
                }
            }
            if (neighbors.length) {
                const {nx, ny, dir} = neighbors[Math.floor(Math.random() * neighbors.length)];
                maze[y][x].walls[dir] = false;
                maze[ny][nx].walls[(dir + 2) % 4] = false;
                maze[ny][nx].visited = true;
                stack.push(current);
                current = {x: nx, y: ny};
            } else {
                current = stack.pop();
            }
        }

        // Remove dead ends as part of generation, before adding entrance/exit
        if (removeDeadEnds) {
            removeMazeDeadEnds(maze);
        }

        // Add entrance and exit if toggled (after dead-end removal)
        if (entranceExit) {
            const entranceX = Math.floor(width / 2);
            maze[0][entranceX].walls[0] = false;
            maze[height - 1][entranceX].walls[2] = false;
        }

        tries++;
        // If removeDeadEnds is on, check for open 2x2 rooms and retry if found
    } while (removeDeadEnds && hasOpen2x2Room(maze) && tries < 50);

    return maze;
}

function drawGrid(ctx, width, height, cellSize) {
    ctx.save();
    ctx.strokeStyle = "rgba(0,0,0,0.15)";
    ctx.lineWidth = 1;
    for (let x = 0; x <= width; x++) {
        ctx.beginPath();
        ctx.moveTo(x * cellSize, 0);
        ctx.lineTo(x * cellSize, height * cellSize);
        ctx.stroke();
    }
    for (let y = 0; y <= height; y++) {
        ctx.beginPath();
        ctx.moveTo(0, y * cellSize);
        ctx.lineTo(width * cellSize, y * cellSize);
        ctx.stroke();
    }
    ctx.restore();
}

function drawMaze(maze, borderMode = true, entranceExit = true) {
    const height = maze.length, width = maze[0].length;
    const canvas = document.getElementById('mazeCanvas');

    let maxCanvas = Math.min(window.innerWidth * 0.95, 480);
    let size = Math.floor(Math.min(maxCanvas / width, maxCanvas / height));
    canvas.width = width * size;
    canvas.height = height * size;
    const ctx = canvas.getContext('2d');

    // Clear and fill with white
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw faded grid
    drawGrid(ctx, width, height, size);

    const entranceX = Math.floor(width / 2);
    if (borderMode) {  
        const drawPath = (x0, y0, x1, y1, thick=false, color="#000") => {
            ctx.beginPath();
            ctx.moveTo(x0, y0);
            ctx.lineTo(x1, y1);
            ctx.strokeStyle = color;
            ctx.lineWidth = 2;
            if (thick) {
                ctx.lineWidth = 4;
            }
            ctx.stroke();
        }
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const cell = maze[y][x];
                const px = x * size, py = y * size;

                // Top wall
                if (cell.walls[0]) {
                    if (y === 0) {
                        drawPath(px, py, px + size, py, true);
                    } else {
                        drawPath(px, py, px + size, py);
                    }
                }

                // Right wall
                if (cell.walls[1]) {
                    if (x === width - 1) {
                        drawPath(px + size, py, px + size, py + size, true);
                    } else {
                        drawPath(px + size, py, px + size, py + size);
                    }
                }

                // Bottom wall
                if (cell.walls[2]) {
                    if (y === height - 1) {
                        drawPath(px + size, py + size, px, py + size, true);
                    } else {
                        drawPath(px + size, py + size, px, py + size);
                    }
                }

                // Left wall
                if (cell.walls[3]) {
                    if (x === 0) {
                        drawPath(px, py + size, px, py, true);
                    } else {
                        drawPath(px, py + size, px, py, false);
                    }
                }

                // Draw border as normal if entrance/exit is hidden
                if (x === entranceX && !entranceExit) {
                    if(y === 0) {
                        drawPath(px, py, px + size, py, true);
                    } else if (y === height - 1){
                        drawPath(px + size, py + size, px, py + size, true);
                    }
                }
            }
        }
    } else {
        // Inside path lines (draw only the open paths)
        ctx.strokeStyle = "#0074D9";
        ctx.lineWidth = 3;
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const cell = maze[y][x];
                const px = x * size + size / 2;
                const py = y * size + size / 2;
                for (let dir = 0; dir < 4; dir++) {
                    if (!cell.walls[dir]) {
                        let nx = x + [0, 1, 0, -1][dir];
                        let ny = y + [-1, 0, 1, 0][dir];
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            let npx = nx * size + size / 2;
                            let npy = ny * size + size / 2;
                            ctx.beginPath();
                            ctx.moveTo(px, py);
                            ctx.lineTo(npx, npy);
                            ctx.stroke();
                        }
                    }
                }
            }
        }
        // Draw entrance/exit in path mode if toggled
        if (entranceExit) {
            ctx.strokeStyle = "#2ECC40";
            ctx.lineWidth = 4;
            // Entrance (top middle)
            ctx.beginPath();
            ctx.moveTo(entranceX * size + size / 2, 0);
            ctx.lineTo(entranceX * size + size / 2, size / 2);
            ctx.stroke();
            // Exit (bottom middle)
            ctx.strokeStyle = "#FF4136";
            ctx.beginPath();
            ctx.moveTo(entranceX * size + size / 2, height * size);
            ctx.lineTo(entranceX * size + size / 2, height * size - size / 2);
            ctx.stroke();
        }
    }
}

function renderMaze(forceNew = false) {
    const width = Math.max(2, Math.min(50, parseInt(document.getElementById('mazeWidth').value)));
    const height = Math.max(2, Math.min(50, parseInt(document.getElementById('mazeHeight').value)));
    const borderMode = document.getElementById('borderModeToggle').checked;
    const entranceExit = document.getElementById('entranceExitToggle').checked;
    const removeDeadEnds = document.getElementById('removeDeadEndsToggle').checked;

    if (
        forceNew ||
        !cachedMaze ||
        cachedWidth !== width ||
        cachedHeight !== height ||
        cachedRemoveDeadEnds !== removeDeadEnds
    ) {
        cachedMaze = generateMaze(width, height, true, removeDeadEnds);
        cachedWidth = width;
        cachedHeight = height;
        cachedRemoveDeadEnds = removeDeadEnds;
    }
    drawMaze(cachedMaze, borderMode, entranceExit);
}
