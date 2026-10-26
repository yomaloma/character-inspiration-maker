// --- CONSTANTS & FONTS ---
const GOOGLE_FONTS = [
    { name: "Montserrat", value: "'Montserrat', sans-serif" },
    { name: "Playfair Display", value: "'Playfair Display', serif" },
    { name: "Bebas Neue", value: "'Bebas Neue', sans-serif" },
    { name: "Oswald", value: "'Oswald', sans-serif" },
    { name: "Caveat", value: "'Caveat', cursive" },
    { name: "Roboto", value: "'Roboto', sans-serif" },
    { name: "Courier Prime", value: "'Courier Prime', monospace" },
    { name: "Arial", value: "Arial, sans-serif" },
    { name: "Times New Roman", value: "'Times New Roman', serif" },
    { name: "Courier New", value: "'Courier New', monospace" }
];

// --- DEFAULT STATE ---
const defaultState = {
    text: { title: "CHARACTER INSPIRATION", name: "", music: "" },
    images: {},
    styles: {
        "--poster-bg": "#ffffff",
        "--border-color": "#000000",
        "--border-thickness": "3px",
        "--border-style": "solid",
        "--border-radius": "0px",
        "--show-borders": true, 
        "--show-line": "block",
        
        "--title-font": "'Bebas Neue', sans-serif",
        "--title-color": "#000000",
        "--title-align": "center",
        "--title-size": "4.5cqw",
        "--title-tracking": "0px",
        "--title-shadow": "none",
        "--title-stroke": "0px transparent",
        
        "--name-font": "'Montserrat', sans-serif",
        "--name-color": "#555555",
        "--name-align": "center",
        "--name-size": "3cqw",
        "--name-tracking": "0px",
        "--name-shadow": "none",
        "--name-stroke": "0px transparent",
        
        "--music-font": "'Montserrat', sans-serif",
        "--music-color": "#333333",
        "--music-align": "center",
        "--music-size": "2.5cqw",
        "--music-tracking": "0px",
        "--music-shadow": "none"
    }
};

let appState = JSON.parse(JSON.stringify(defaultState));

// Populate Font Selects
document.querySelectorAll('.font-select').forEach(select => {
    GOOGLE_FONTS.forEach(font => {
        const option = document.createElement('option');
        option.value = font.value;
        option.textContent = font.name;
        select.appendChild(option);
    });
});

// --- LOCAL STORAGE & STYLE APPLICATION ---
function saveState() {
    try {
        localStorage.setItem('memeState', JSON.stringify(appState));
    } catch (e) {
        console.warn("Could not save to localStorage.");
    }
}

function applyStylesToDOM() {
    const s = appState.styles;
    const root = document.documentElement;

    // 1. Determine Actual Border Width
    const isVisible = s['--show-borders'];
    const thickness = s['--border-thickness'];
    const finalWidth = isVisible ? thickness : '0px';
    root.style.setProperty('--border-width', finalWidth);

    // 2. Apply all other styles
    for (const [key, value] of Object.entries(s)) {
        if (key !== '--show-borders' && key !== '--border-width') {
            root.style.setProperty(key, value);
        }
    }
}

function loadState() {
    const saved = localStorage.getItem('memeState');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            appState = { ...appState, ...parsed }; 
            
            // Fallbacks for older saved states
            if (appState.styles['--show-borders'] === undefined) appState.styles['--show-borders'] = true;
            
            applyStylesToDOM();

            document.getElementById('display-title').innerText = appState.text.title;
            document.getElementById('char-name').innerText = appState.text.name;
            document.getElementById('music-box').innerText = appState.text.music;

            const imageIds = ['img1', 'img2', 'img3', 'img4', 'img5', 'img6', 'imgCenter'];
            imageIds.forEach(id => {
                if (appState.images[id]) {
                    const imgData = appState.images[id];
                    const img = document.getElementById(id);
                    const label = document.getElementById('label' + id.replace('img', ''));
                    
                    img.src = imgData.src;
                    img.style.display = 'block';
                    if(label) label.style.display = 'none';
                    
                    // Explicitly show the delete button
                    document.getElementById('delete-' + id).style.display = 'flex';
                    
                    img.dataset.scale = imgData.scale;
                    img.dataset.x = imgData.x;
                    img.dataset.y = imgData.y;
                    applyTransform(img);
                }
            });
            updateSettingsUI();
        } catch (e) { console.error("Failed to load state", e); }
    }
}

document.querySelectorAll('[contenteditable="true"]').forEach(el => {
    el.addEventListener('input', () => {
        if (el.id === 'display-title') appState.text.title = el.innerText;
        if (el.id === 'char-name') appState.text.name = el.innerText;
        if (el.id === 'music-box') appState.text.music = el.innerText;
        saveState();
    });
});

// --- IMAGE LOGIC ---
let activeImg = null;
let startX = 0, startY = 0;
let initialX = 0, initialY = 0;
let isPinching = false;
let touchDistance = 0;

function compressImage(file, callback) {
    const reader = new FileReader();
    reader.onload = function(e) {
        const img = new Image();
        img.onload = function() {
            // FIX 3: Prevent division by zero on corrupted images
            if (img.width === 0 || img.height === 0) {
                alert("Error: The uploaded file is corrupted or not a valid image.");
                return;
            }

            const maxSize = 1000; 
            let width = img.width;
            let height = img.height;

            if (width > maxSize || height > maxSize) {
                if (width > height) {
                    height *= maxSize / width;
                    width = maxSize;
                } else {
                    width *= maxSize / height;
                    height = maxSize;
                }
            }

            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            
            let dataUrl;
            try {
                dataUrl = canvas.toDataURL('image/webp', 0.8);
            } catch(err) {
                dataUrl = canvas.toDataURL('image/png');
            }
            
            if (!dataUrl.startsWith('data:image/webp') && !dataUrl.startsWith('data:image/png')) {
                dataUrl = canvas.toDataURL('image/png');
            }

            callback(dataUrl);
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function loadImage(event, imgId) {
    const file = event.target.files[0];
    if (file) {
        compressImage(file, function(compressedDataUrl) {
            if (!compressedDataUrl) return; // Exit if compression failed

            const img = document.getElementById(imgId);
            const label = document.getElementById('label' + imgId.replace('img', ''));
            const cell = img.parentElement;
            
            // FIX 2: Use onload to accurately wait for the image to be ready
            img.onload = function() {
                const cellWidth = cell.clientWidth;
                const cellHeight = cell.clientHeight;
                const imgWidth = img.naturalWidth;
                const imgHeight = img.naturalHeight;

                let fitScale = Math.min(cellWidth / imgWidth, cellHeight / imgHeight);
                if (imgWidth < cellWidth && imgHeight < cellHeight) fitScale = 1;

                appState.images[imgId] = { src: compressedDataUrl, scale: fitScale, x: 0, y: 0 };
                saveState();

                img.dataset.scale = fitScale;
                img.dataset.x = 0;
                img.dataset.y = 0;
                applyTransform(img);
                
                // Clear onload to prevent memory leaks
                img.onload = null;
            };

            img.src = compressedDataUrl;
            img.style.display = 'block';
            if(label) label.style.display = 'none';
            document.getElementById('delete-' + imgId).style.display = 'flex';
        });
    }
}

function clearImage(e, imgId) {
    e.stopPropagation(); 
    const img = document.getElementById(imgId);
    const label = document.getElementById('label' + imgId.replace('img', ''));
    
    if(confirm("Remove this image?")) {
        img.src = "";
        img.style.display = 'none';
        img.dataset.scale = 1;
        img.dataset.x = 0;
        img.dataset.y = 0;
        if(label) label.style.display = 'block';
        
        document.getElementById('delete-' + imgId).style.display = 'none';
        
        delete appState.images[imgId];
        saveState();
    }
}

function applyTransform(img) {
    const s = parseFloat(img.dataset.scale) || 1;
    const x = parseFloat(img.dataset.x) || 0;
    const y = parseFloat(img.dataset.y) || 0;
    img.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${s})`;
}

// Update the event listener setup for images
document.querySelectorAll('.uploaded-img').forEach(img => {
    img.addEventListener('pointerdown', dragStart);
    // ADDED: Prevent native context menu on long press (mobile) or right-click (desktop)
    img.addEventListener('contextmenu', (e) => e.preventDefault());
});

function dragStart(e) {
    if (e.pointerType === 'touch' && e.isPrimary === false) return;
    if (isPinching) return;
    activeImg = e.target;
    activeImg.setPointerCapture(e.pointerId);
    startX = e.clientX; startY = e.clientY;
    initialX = parseFloat(activeImg.dataset.x) || 0;
    initialY = parseFloat(activeImg.dataset.y) || 0;
    e.preventDefault(); 
}

document.addEventListener('pointermove', (e) => {
    if (!activeImg || isPinching) return;
    if(e.pointerType === 'touch') e.preventDefault();
    activeImg.dataset.x = initialX + (e.clientX - startX);
    activeImg.dataset.y = initialY + (e.clientY - startY);
    applyTransform(activeImg);
});

document.addEventListener('pointerup', (e) => {
    if (activeImg) {
        activeImg.releasePointerCapture(e.pointerId);
        if (appState.images[activeImg.id]) {
            appState.images[activeImg.id].x = activeImg.dataset.x;
            appState.images[activeImg.id].y = activeImg.dataset.y;
            saveState();
        }
        activeImg = null;
    }
});

// Wheel zoom
document.querySelectorAll('.cell').forEach(cell => {
    cell.addEventListener('wheel', (e) => {
        if (e.target.classList.contains('uploaded-img')) {
            e.preventDefault();
            let currentScale = parseFloat(e.target.dataset.scale) || 1;
            currentScale -= e.deltaY * 0.002; 
            currentScale = Math.min(Math.max(0.1, currentScale), 10); 
            e.target.dataset.scale = currentScale;
            applyTransform(e.target);
            if (appState.images[e.target.id]) {
                appState.images[e.target.id].scale = currentScale;
                saveState();
            }
        }
    }, { passive: false });
});

// Pinch zoom
document.querySelectorAll('.uploaded-img').forEach(img => {
    img.addEventListener('touchstart', (e) => {
        if (e.touches.length === 2) {
            isPinching = true;
            activeImg = null; 
            touchDistance = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
        }
    }, { passive: false });

    img.addEventListener('touchmove', (e) => {
        if (e.touches.length === 2) {
            e.preventDefault(); 
            const newDistance = Math.hypot(e.touches[0].pageX - e.touches[1].pageX, e.touches[0].pageY - e.touches[1].pageY);
            let currentScale = parseFloat(img.dataset.scale) || 1;
            let newScale = currentScale * (newDistance / touchDistance);
            newScale = Math.min(Math.max(0.1, newScale), 10); 
            img.dataset.scale = newScale;
            applyTransform(img);
            touchDistance = newDistance;
            if (appState.images[img.id]) {
                appState.images[img.id].scale = newScale;
                saveState();
            }
        }
    }, { passive: false });

    img.addEventListener('touchend', (e) => {
        if (e.touches.length < 2) isPinching = false;
    });
});

// --- SETTINGS UI & BINDINGS ---
const overlay = document.getElementById('settings-overlay');
document.getElementById('settings-btn').addEventListener('click', () => overlay.classList.add('active'));
document.getElementById('close-settings').addEventListener('click', () => overlay.classList.remove('active'));

document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
        btn.classList.add('active');
        document.getElementById(btn.dataset.tab).classList.add('active');
    });
});

function updateStyleVariable(key, value, uiElementId) {
    // FIX 1: Change key.includes('outline') to key.includes('stroke')
    if (key === '--show-borders') {
        appState.styles['--show-borders'] = value; 
    } else if (key === '--show-line') {
        appState.styles[key] = value ? 'block' : 'none';
    } else if (key.includes('shadow')) {
        appState.styles[key] = value ? '2px 2px 4px rgba(0,0,0,0.8)' : 'none';
    } else if (key.includes('stroke')) {
        appState.styles[key] = value ? '1px black' : '0px transparent';
    } else {
        appState.styles[key] = value;
    }

    applyStylesToDOM();

    if (key.includes('size') || key.includes('tracking') || key.includes('thickness') || key.includes('radius')) {
        const label = document.getElementById(uiElementId + '-val');
        if (label) label.innerText = String(value).replace('cqw', '').replace('px', ''); 
    }
    saveState();
}

const bindings = [
    // Changed 'input' to 'change' for all color pickers to prevent mobile render crashes
    { id: 'bg-color', prop: '--poster-bg', event: 'change' },
    { id: 'border-color', prop: '--border-color', event: 'change' },
    
    { id: 'border-thickness', prop: '--border-thickness', event: 'input', suffix: 'px' },
    { id: 'border-style', prop: '--border-style', event: 'change' },
    { id: 'border-radius', prop: '--border-radius', event: 'input', suffix: 'px' },
    { id: 'show-borders', prop: '--show-borders', event: 'change', type: 'checkbox' },
    { id: 'show-line', prop: '--show-line', event: 'change', type: 'checkbox' },
    
    { id: 'title-font', prop: '--title-font', event: 'change' },
    { id: 'title-color', prop: '--title-color', event: 'change' },
    { id: 'title-size', prop: '--title-size', event: 'input', suffix: 'cqw' },
    { id: 'title-align', prop: '--title-align', event: 'change' },
    { id: 'title-tracking', prop: '--title-tracking', event: 'input', suffix: 'px' },
    { id: 'title-shadow', prop: '--title-shadow', event: 'change', type: 'checkbox' },
    { id: 'title-outline', prop: '--title-stroke', event: 'change', type: 'checkbox' },

    { id: 'name-font', prop: '--name-font', event: 'change' },
    { id: 'name-color', prop: '--name-color', event: 'change' },
    { id: 'name-size', prop: '--name-size', event: 'input', suffix: 'cqw' },
    { id: 'name-align', prop: '--name-align', event: 'change' },
    { id: 'name-tracking', prop: '--name-tracking', event: 'input', suffix: 'px' },
    { id: 'name-shadow', prop: '--name-shadow', event: 'change', type: 'checkbox' },
    { id: 'name-outline', prop: '--name-stroke', event: 'change', type: 'checkbox' },

    { id: 'music-font', prop: '--music-font', event: 'change' },
    { id: 'music-color', prop: '--music-color', event: 'change' },
    { id: 'music-size', prop: '--music-size', event: 'input', suffix: 'cqw' },
    { id: 'music-align', prop: '--music-align', event: 'change' },
    { id: 'music-tracking', prop: '--music-tracking', event: 'input', suffix: 'px' },
    { id: 'music-shadow', prop: '--music-shadow', event: 'change', type: 'checkbox' }
];

bindings.forEach(bind => {
    const el = document.getElementById(bind.id);
    if(el) {
        el.addEventListener(bind.event, (e) => {
            if (bind.type === 'checkbox') {
                updateStyleVariable(bind.prop, e.target.checked, bind.id);
            } else {
                let val = e.target.value;
                if (bind.suffix) val += bind.suffix;
                updateStyleVariable(bind.prop, val, bind.id);
            }
        });
    }
});

function updateSettingsUI() {
    const s = appState.styles;
    
    // Theme
    document.getElementById('bg-color').value = s['--poster-bg'];
    document.getElementById('border-color').value = s['--border-color'];
    document.getElementById('border-thickness').value = s['--border-thickness'].replace('px', '');
    document.getElementById('border-thickness-val').innerText = s['--border-thickness'].replace('px', '');
    document.getElementById('border-style').value = s['--border-style'];
    document.getElementById('border-radius').value = s['--border-radius'].replace('px', '');
    document.getElementById('border-radius-val').innerText = s['--border-radius'].replace('px', '');
    document.getElementById('show-borders').checked = s['--show-borders'];
    document.getElementById('show-line').checked = s['--show-line'] === 'block';

    // Title
    document.getElementById('title-font').value = s['--title-font'];
    document.getElementById('title-color').value = s['--title-color'];
    document.getElementById('title-size').value = s['--title-size'].replace('cqw', '');
    document.getElementById('title-size-val').innerText = s['--title-size'].replace('cqw', '');
    document.getElementById('title-align').value = s['--title-align'];
    document.getElementById('title-tracking').value = s['--title-tracking'].replace('px', '');
    document.getElementById('title-tracking-val').innerText = s['--title-tracking'].replace('px', '');
    document.getElementById('title-shadow').checked = s['--title-shadow'] !== 'none';
    document.getElementById('title-outline').checked = s['--title-stroke'] !== '0px transparent';

    // Name
    document.getElementById('name-font').value = s['--name-font'];
    document.getElementById('name-color').value = s['--name-color'];
    document.getElementById('name-size').value = s['--name-size'].replace('cqw', '');
    document.getElementById('name-size-val').innerText = s['--name-size'].replace('cqw', '');
    document.getElementById('name-align').value = s['--name-align'];
    document.getElementById('name-tracking').value = s['--name-tracking'].replace('px', '');
    document.getElementById('name-tracking-val').innerText = s['--name-tracking'].replace('px', '');
    document.getElementById('name-shadow').checked = s['--name-shadow'] !== 'none';
    document.getElementById('name-outline').checked = s['--name-stroke'] !== '0px transparent';

    // Music
    document.getElementById('music-font').value = s['--music-font'];
    document.getElementById('music-color').value = s['--music-color'];
    document.getElementById('music-size').value = s['--music-size'].replace('cqw', '');
    document.getElementById('music-size-val').innerText = s['--music-size'].replace('cqw', '');
    document.getElementById('music-align').value = s['--music-align'];
    document.getElementById('music-tracking').value = s['--music-tracking'].replace('px', '');
    document.getElementById('music-tracking-val').innerText = s['--music-tracking'].replace('px', '');
    document.getElementById('music-shadow').checked = s['--music-shadow'] !== 'none';
}

// --- RESET LOGIC (Refactored) ---
function resetApp() {
    if(confirm("Are you sure you want to reset everything? All images and text will be lost.")) {
        localStorage.removeItem('memeState');
        location.reload();
    }
}

document.getElementById('reset-btn').addEventListener('click', resetApp);
document.getElementById('quick-reset-btn').addEventListener('click', resetApp);

// --- DOWNLOAD & COPY LOGIC ---
function generateCanvas(callback) {
    const poster = document.getElementById('poster');
    const originalWidth = poster.offsetWidth; 
    const targetWidth = 800; 
    const ratio = targetWidth / originalWidth;

    const uploadLabels = document.querySelectorAll('.upload-label');
    const deleteBtns = document.querySelectorAll('.delete-btn');
    uploadLabels.forEach(el => el.style.opacity = '0');
    deleteBtns.forEach(el => el.style.display = 'none');

    html2canvas(poster, {
        scale: 2, 
        backgroundColor: appState.styles['--poster-bg'] || '#ffffff',
        logging: false,
        useCORS: true,
        onclone: (clonedDoc) => {
            const clonedPoster = clonedDoc.getElementById('poster');
            clonedPoster.style.width = targetWidth + 'px';
            clonedPoster.style.height = targetWidth + 'px';
            clonedPoster.style.aspectRatio = 'auto';

            const clonedImages = clonedDoc.querySelectorAll('.uploaded-img');
            clonedImages.forEach(img => {
                let s = parseFloat(img.dataset.scale) || 1;
                let x = parseFloat(img.dataset.x) || 0;
                let y = parseFloat(img.dataset.y) || 0;
                s = s * ratio; x = x * ratio; y = y * ratio;
                img.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px)) scale(${s})`;
            });
        }
    }).then(canvas => {
        uploadLabels.forEach(el => el.style.opacity = '1');
        const imageIds = ['img1', 'img2', 'img3', 'img4', 'img5', 'img6', 'imgCenter'];
        imageIds.forEach(id => {
            if(appState.images[id]) {
                document.getElementById('delete-' + id).style.display = 'flex';
            }
        });
        callback(canvas);
    }).catch(err => {
        uploadLabels.forEach(el => el.style.opacity = '1');
        const imageIds = ['img1', 'img2', 'img3', 'img4', 'img5', 'img6', 'imgCenter'];
        imageIds.forEach(id => {
            if(appState.images[id]) {
                document.getElementById('delete-' + id).style.display = 'flex';
            }
        });
        alert("Error generating image. Please try again.");
    });
}

document.getElementById('download-btn').addEventListener('click', () => {
    generateCanvas((canvas) => {
        const link = document.createElement('a');
        link.download = 'character-inspiration.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
});

document.getElementById('copy-btn').addEventListener('click', () => {
    generateCanvas((canvas) => {
        canvas.toBlob(blob => {
            try {
                const item = new ClipboardItem({ "image/png": blob });
                navigator.clipboard.write([item]).then(() => {
                    alert("Image copied to clipboard!");
                }).catch(err => {
                    console.error("Copy failed", err);
                    alert("Failed to copy. Your browser might not support it.");
                });
            } catch (e) {
                console.error(e);
                alert("Clipboard API not supported in your browser.");
            }
        });
    });
});

window.addEventListener('DOMContentLoaded', loadState);
