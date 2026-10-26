let activeImg = null;
let startX = 0, startY = 0;
let initialX = 0, initialY = 0;
let isPinching = false;
let touchDistance = 0;

// 1. Load Image Function & Auto-Fit
function loadImage(event, imgId) {
    const file = event.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = document.getElementById(imgId);
            const label = document.getElementById('label' + imgId.replace('img', ''));
            const cell = img.parentElement;
            
            img.src = e.target.result;
            img.style.display = 'block';
            if(label) label.style.display = 'none';
            
            // Wait for image to load to calculate dimensions
            img.onload = function() {
                const cellWidth = cell.clientWidth;
                const cellHeight = cell.clientHeight;
                const imgWidth = img.naturalWidth;
                const imgHeight = img.naturalHeight;

                // Calculate scale to "contain" the image within the cell
                const scaleX = cellWidth / imgWidth;
                const scaleY = cellHeight / imgHeight;
                let fitScale = Math.min(scaleX, scaleY); 

                // If the image is tiny, don't scale it up past 100%
                if (imgWidth < cellWidth && imgHeight < cellHeight) {
                    fitScale = 1;
                }

                // Set initial dataset values
                img.dataset.scale = fitScale;
                img.dataset.x = 0;
                img.dataset.y = 0;
                
                applyTransform(img);
            };
        }
        reader.readAsDataURL(file);
    }
}

// 2. Helper function to apply centered transforms
function applyTransform(img) {
    const s = parseFloat(img.dataset.scale) || 1;
    const x = parseFloat(img.dataset.x) || 0;
    const y = parseFloat(img.dataset.y) || 0;
    
    // translate(-50%, -50%) centers the image first, then we add the drag offsets (x, y)
    img.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${s})`;
}

// 3. Drag & Drop (Panning) Logic
document.querySelectorAll('.uploaded-img').forEach(img => {
    img.addEventListener('pointerdown', dragStart);
});

function dragStart(e) {
    if (e.pointerType === 'touch' && e.isPrimary === false) return;
    if (isPinching) return;

    activeImg = e.target;
    activeImg.setPointerCapture(e.pointerId);
    
    startX = e.clientX;
    startY = e.clientY;
    
    initialX = parseFloat(activeImg.dataset.x) || 0;
    initialY = parseFloat(activeImg.dataset.y) || 0;
    
    // Prevent default drag ghost image
    e.preventDefault(); 
}

document.addEventListener('pointermove', (e) => {
    if (!activeImg || isPinching) return;
    if(e.pointerType === 'touch') e.preventDefault();

    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    
    activeImg.dataset.x = initialX + dx;
    activeImg.dataset.y = initialY + dy;
    
    applyTransform(activeImg);
});

document.addEventListener('pointerup', (e) => {
    if (activeImg) {
        activeImg.releasePointerCapture(e.pointerId);
        activeImg = null;
    }
});

// 4. Mouse Wheel Zoom (Desktop)
document.querySelectorAll('.cell').forEach(cell => {
    cell.addEventListener('wheel', (e) => {
        if (e.target.classList.contains('uploaded-img')) {
            e.preventDefault();
            
            let currentScale = parseFloat(e.target.dataset.scale) || 1;
            currentScale -= e.deltaY * 0.002; // Adjusted sensitivity
            currentScale = Math.min(Math.max(0.1, currentScale), 10); 
            
            e.target.dataset.scale = currentScale;
            applyTransform(e.target);
        }
    }, { passive: false });
});

// 5. Pinch-to-Zoom (Mobile)
document.querySelectorAll('.uploaded-img').forEach(img => {
    img.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            isPinching = true;
            activeImg = null; // Stop dragging while pinching
            touchDistance = Math.hypot(
                e.touches[0].pageX - e.touches[1].pageX,
                e.touches[0].pageY - e.touches[1].pageY
            );
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
            newScale = Math.min(Math.max(0.1, newScale), 10); 
            
            img.dataset.scale = newScale;
            applyTransform(img);
            
            touchDistance = newDistance;
        }
    }, { passive: false });

    img.addEventListener('touchend', (e) => {
        if (e.touches.length < 2) {
            isPinching = false;
        }
    });
});

// 6. Download Logic (Proportional Scaling Fix)
document.getElementById('download-btn').addEventListener('click', function() {
    const poster = document.getElementById('poster');
    
    // Get current physical width (e.g., 350px on a phone) to calculate the ratio
    const originalWidth = poster.offsetWidth; 
    const targetWidth = 800; 
    const ratio = targetWidth / originalWidth;

    const uploadLabels = document.querySelectorAll('.upload-label');
    uploadLabels.forEach(el => el.style.opacity = '0');

    html2canvas(poster, {
        scale: 2, 
        backgroundColor: '#ffffff',
        logging: false,
        useCORS: true,
        onclone: (clonedDoc) => {
            const clonedPoster = clonedDoc.getElementById('poster');
            // Force the clone to be exactly 800x800
            clonedPoster.style.width = targetWidth + 'px';
            clonedPoster.style.height = targetWidth + 'px';
            clonedPoster.style.aspectRatio = 'auto';

            // Proportionally resize the image coordinates and scales in the clone
            const clonedImages = clonedDoc.querySelectorAll('.uploaded-img');
            clonedImages.forEach(img => {
                let s = parseFloat(img.dataset.scale) || 1;
                let x = parseFloat(img.dataset.x) || 0;
                let y = parseFloat(img.dataset.y) || 0;

                // Multiply everything by the ratio so it looks exactly like the mobile view
                s = s * ratio;
                x = x * ratio;
                y = y * ratio;

                img.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${s})`;
            });
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