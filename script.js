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
    if (e.pointerType === 'touch' && e.isPrimary === false) return;

    activeImg = e.target;
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
    
    if(e.pointerType === 'touch') e.preventDefault();

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

document.addEventListener('pointercancel', () => {
    activeImg = null;
});

// 3. Mouse Wheel Zoom (Desktop)
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

// 4. Pinch-to-Zoom (Mobile)
let touchDistance = 0;

document.querySelectorAll('.uploaded-img').forEach(img => {
    img.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            touchDistance = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );
            activeImg = null; 
        }
    }, { passive: false });

    img.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault(); 
            
            const newDistance = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );
            
            let currentScale = parseFloat(img.dataset.scale) || 1;
            const ratio = newDistance / touchDistance;
            let newScale = currentScale * ratio;
            newScale = Math.min(Math.max(0.2, newScale), 10); 
            
            img.dataset.scale = newScale;
            
            const style = window.getComputedStyle(img);
            const matrix = new WebKitCSSMatrix(style.transform);
            const currentX = matrix.m41;
            const currentY = matrix.m42;
            
            img.style.transform = `translate(${currentX}px, ${currentY}px) scale(${newScale})`;
            
            touchDistance = newDistance;
        }
    }, { passive: false });
});

// 5. Download Logic (Forced 800x800 Square output)
document.getElementById('download-btn').addEventListener('click', function() {
    const poster = document.getElementById('poster');
    
    const uploadLabels = document.querySelectorAll('.upload-label');
    uploadLabels.forEach(el => el.style.opacity = '0');

    html2canvas(poster, {
        scale: 2, 
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        // Force the hidden clone to be perfectly square so it doesn't squish on download
        onclone: (clonedDoc) => {
            const clonedPoster = clonedDoc.getElementById('poster');
            clonedPoster.style.width = '800px';
            clonedPoster.style.height = '800px';
            clonedPoster.style.aspectRatio = 'auto'; // Override to prevent conflicts
        }
    }).then(canvas => {
        uploadLabels.forEach(el => el.style.opacity = '1');
        
        const link = document.createElement('a');
        link.download = 'character-inspiration.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    }).catch(err => {
        uploadLabels.forEach(el => el.style.opacity = '1');
        alert("Error generating image. Please try again.");
    });
});