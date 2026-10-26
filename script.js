let activeImg = null;
let startX = 0, startY = 0;
let initialX = 0, initialY = 0;

// 1. Load Image Function
function loadImage(event, imgId) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.getElementById(imgId);
            const label = document.getElementById('label' + imgId.replace('img', ''));
            
            img.src = e.target.result;
            img.style.display = 'block';
            if(label) label.style.display = 'none';
            
            // Reset position and scale
            img.style.left = '50%';
            img.style.top = '50%';
            img.style.transform = 'translate(-50%, -50%) scale(1)';
            img.dataset.scale = 1;
        }
        reader.readAsDataURL(file);
    }
}

// 2. Drag & Drop (Panning) Logic
document.querySelectorAll('.uploaded-img').forEach(img => {
    img.addEventListener('pointerdown', dragStart);
});

function dragStart(e) {
    activeImg = e.target;
    e.preventDefault(); 
    activeImg.setPointerCapture(e.pointerId);
    
    startX = e.clientX;
    startY = e.clientY;
    
    const style = window.getComputedStyle(activeImg);
    const matrix = new WebKitCSSMatrix(style.transform);
    initialX = matrix.m41;
    initialY = matrix.m42;
}

document.addEventListener('pointermove', (e) => {
    if (!activeImg) return;
    
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    const newX = initialX + dx;
    const newY = initialY + dy;
    
    const currentScale = parseFloat(activeImg.dataset.scale) || 1;
    activeImg.style.transform = `translate(${newX}px, ${newY}px) scale(${currentScale})`;
    
    activeImg.style.left = '0';
    activeImg.style.top = '0';
    activeImg.style.transformOrigin = 'top left';
});

document.addEventListener('pointerup', (e) => {
    if (activeImg) {
        activeImg.releasePointerCapture(e.pointerId);
        activeImg = null;
    }
});

// 3. Zoom Logic (Scroll Wheel)
document.querySelectorAll('.cell').forEach(cell => {
    cell.addEventListener('wheel', (e) => {
        if (e.target.classList.contains('uploaded-img')) {
            e.preventDefault();
            
            let currentScale = parseFloat(e.target.dataset.scale) || 1;
            const zoomSensitivity = 0.001;
            
            currentScale -= e.deltaY * zoomSensitivity;
            currentScale = Math.min(Math.max(0.2, currentScale), 10); 
            
            e.target.dataset.scale = currentScale;
            
            const style = window.getComputedStyle(e.target);
            const matrix = new WebKitCSSMatrix(style.transform);
            const currentX = matrix.m41;
            const currentY = matrix.m42;
            
            e.target.style.transform = `translate(${currentX}px, ${currentY}px) scale(${currentScale})`;
        }
    }, { passive: false });
});

// 4. Download Logic
document.getElementById('download-btn').addEventListener('click', function() {
    const poster = document.getElementById('poster');
    
    // Hide upload "+" labels briefly for the screenshot
    const uploadLabels = document.querySelectorAll('.upload-label');
    uploadLabels.forEach(el => el.style.opacity = '0');

    html2canvas(poster, {
        scale: 2, 
        backgroundColor: '#ffffff',
        logging: false
    }).then(canvas => {
        // Restore labels
        uploadLabels.forEach(el => el.style.opacity = '1');
        
        const link = document.createElement('a');
        link.download = 'character-inspiration.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
});