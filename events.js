// Regenerate maze on generate button, change of size or "remove dead ends" toggle
document.getElementById('generateBtn').onclick = () => renderMaze(true);
document.getElementById('mazeWidth').onchange = () => renderMaze(true);
document.getElementById('mazeHeight').onchange = () => renderMaze(true);
document.getElementById('removeDeadEndsToggle').onchange = () => renderMaze(true);

// Only redraw on border mode and entrance/exit toggle
document.getElementById('borderModeToggle').onchange = () => renderMaze(false);
document.getElementById('entranceExitToggle').onchange = () => renderMaze(false);

// Save as PNG button functionality
document.getElementById('savePngBtn').onclick = function() {
    const canvas = document.getElementById('mazeCanvas');
    const width = document.getElementById('mazeWidth').value;
    const height = document.getElementById('mazeHeight').value;
    const borderMode = document.getElementById('borderModeToggle').checked;
    const entranceExit = document.getElementById('entranceExitToggle').checked;
    let mode = borderMode ? "borderMode" : "pathMode";
    let ee = entranceExit ? "withEntranceExit" : "withoutEntranceExit";
    const filename = `maze_${width}x${height}_${mode}_${ee}.png`;

    // Create a temporary link and trigger download
    const link = document.createElement('a');
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};