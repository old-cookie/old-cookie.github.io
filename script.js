const svgCanvas = document.getElementById('svg-canvas');
const customizationPanel = document.getElementById('customization-panel');
const elementColor = document.getElementById('element-color');
const elementSize = document.getElementById('element-size');
const elementLabel = document.getElementById('element-label');

let selectedElement = null;
let offset = { x: 0, y: 0 };

function createRect() {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', '50');
    rect.setAttribute('y', '50');
    rect.setAttribute('width', '100');
    rect.setAttribute('height', '50');
    rect.setAttribute('fill', 'blue');
    rect.addEventListener('click', selectElement);
    rect.addEventListener('mousedown', startDragging);
    svgCanvas.appendChild(rect);
}

function createCircle() {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', '150');
    circle.setAttribute('cy', '150');
    circle.setAttribute('r', '50');
    circle.setAttribute('fill', 'red');
    circle.addEventListener('click', selectElement);
    circle.addEventListener('mousedown', startDragging);
    svgCanvas.appendChild(circle);
}

function createLine() {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', '50');
    line.setAttribute('y1', '250');
    line.setAttribute('x2', '250');
    line.setAttribute('y2', '250');
    line.setAttribute('stroke', 'green');
    line.setAttribute('stroke-width', '2');
    line.addEventListener('click', selectElement);
    line.addEventListener('mousedown', startDragging);
    svgCanvas.appendChild(line);
}

function createText() {
    const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    text.setAttribute('x', '50');
    text.setAttribute('y', '350');
    text.textContent = 'Hello, SVGFlow!';
    text.setAttribute('fill', 'black');
    text.addEventListener('click', selectElement);
    text.addEventListener('mousedown', startDragging);
    svgCanvas.appendChild(text);
}

function selectElement(event) {
    if (selectedElement) {
        selectedElement.setAttribute('stroke', 'none');
    }
    selectedElement = event.target;
    selectedElement.setAttribute('stroke', 'black');
    selectedElement.setAttribute('stroke-width', '2');
    showCustomizationPanel();
}

function startDragging(event) {
    selectedElement = event.target;
    offset.x = event.clientX - selectedElement.getBoundingClientRect().left;
    offset.y = event.clientY - selectedElement.getBoundingClientRect().top;
    document.addEventListener('mousemove', drag);
    document.addEventListener('mouseup', endDragging);
}

function drag(event) {
    selectedElement.setAttribute('transform', `translate(${event.clientX - offset.x}, ${event.clientY - offset.y})`);
}

function endDragging() {
    document.removeEventListener('mousemove', drag);
    document.removeEventListener('mouseup', endDragging);
}

function showCustomizationPanel() {
    customizationPanel.classList.remove('hidden');
    elementColor.value = selectedElement.getAttribute('fill') || selectedElement.getAttribute('stroke');
    elementSize.value = selectedElement.getAttribute('width') || selectedElement.getAttribute('r') || selectedElement.getAttribute('stroke-width');
    elementLabel.value = selectedElement.textContent || '';
}

function applyCustomization() {
    if (selectedElement) {
        selectedElement.setAttribute('fill', elementColor.value);
        selectedElement.setAttribute('stroke', elementColor.value);
        selectedElement.setAttribute('width', elementSize.value);
        selectedElement.setAttribute('height', elementSize.value);
        selectedElement.setAttribute('r', elementSize.value);
        selectedElement.setAttribute('stroke-width', elementSize.value);
        selectedElement.textContent = elementLabel.value;
    }
    customizationPanel.classList.add('hidden');
}

function importData() {
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = '.json';
    fileInput.addEventListener('change', handleFileImport);
    fileInput.click();
}

function handleFileImport(event) {
    const file = event.target.files[0];
    const reader = new FileReader();
    reader.onload = function (e) {
        const data = JSON.parse(e.target.result);
        // Process the imported data and create corresponding SVG elements
        // You can customize this part based on your data structure
        data.forEach(element => {
            if (element.type === 'rect') {
                createRect();
            } else if (element.type === 'circle') {
                createCircle();
            } else if (element.type === 'line') {
                createLine();
            } else if (element.type === 'text') {
                createText();
            }
        });
    };
    reader.readAsText(file);
}

function exportData() {
    const data = [];
    const elements = svgCanvas.childNodes;
    for (let i = 0; i < elements.length; i++) {
        const element = elements[i];
        const elementData = {
            type: element.tagName,
            attributes: {}
        };
        for (let j = 0; j < element.attributes.length; j++) {
            const attribute = element.attributes[j];
            elementData.attributes[attribute.name] = attribute.value;
        }
        if (element.tagName === 'text') {
            elementData.text = element.textContent;
        }
        data.push(elementData);
    }
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'svgflow_data.json';
    link.click();
}

// Real-time collaboration using WebSockets
const socket = new WebSocket('ws://localhost:8080');

socket.onmessage = function (event) {
    const data = JSON.parse(event.data);
    // Handle received data and update the SVG canvas accordingly
    // You can customize this part based on your collaboration protocol
    if (data.type === 'create') {
        if (data.elementType === 'rect') {
            createRect();
        } else if (data.elementType === 'circle') {
            createCircle();
        } else if (data.elementType === 'line') {
            createLine();
        } else if (data.elementType === 'text') {
            createText();
        }
    } else if (data.type === 'update') {
        const element = svgCanvas.querySelector(`[data-id="${data.elementId}"]`);
        if (element) {
            for (const [key, value] of Object.entries(data.attributes)) {
                element.setAttribute(key, value);
            }
        }
    } else if (data.type === 'delete') {
        const element = svgCanvas.querySelector(`[data-id="${data.elementId}"]`);
        if (element) {
            element.remove();
        }
    }
};

function sendData(data) {
    socket.send(JSON.stringify(data));
}

// Responsive design
window.addEventListener('resize', adjustCanvasSize);

function adjustCanvasSize() {
    svgCanvas.setAttribute('width', window.innerWidth);
    svgCanvas.setAttribute('height', window.innerHeight);
}

document.getElementById('rectangle').addEventListener('click', createRect);
document.getElementById('circle').addEventListener('click', createCircle);
document.getElementById('line').addEventListener('click', createLine);
document.getElementById('text').addEventListener('click', createText);
document.getElementById('import').addEventListener('click', importData);
document.getElementById('export').addEventListener('click', exportData);
document.getElementById('apply-customization').addEventListener('click', applyCustomization);