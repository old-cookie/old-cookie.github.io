/**
 * Even or Odd AI Checker - Main Application
 * Uses ONNX.js to run a trained neural network for even/odd prediction
 * Author: AI Assistant
 * Features: Material Design 3 UI, Dark Mode, ONNX AI Model
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM elements
    const numberInput = document.getElementById('numberInput');
    const checkButton = document.getElementById('checkButton');
    const resultText = document.getElementById('resultText');

    // AI model session
    let session;

    /**
     * AI Model Management Functions
     * Handles ONNX model loading and initialization
     */

    // Load the ONNX model asynchronously
    async function loadModel() {
        try {
            session = await ort.InferenceSession.create('./even_odd_model.onnx', {
                executionProviders: ['wasm']
            });
            console.log('ONNX model loaded successfully.');
            checkButton.disabled = false;
            resultText.textContent = 'Model loaded. Enter a number.';
        } catch (e) {
            console.error(`Failed to load the ONNX model: ${e}`);
            resultText.textContent = 'Failed to load AI model. Please check console.';
            checkButton.disabled = true;
        }
    }

    // Disable button until model is loaded
    checkButton.disabled = true;
    loadModel();

    /**
     * Number Processing and AI Inference
     * Main logic for processing user input and getting AI predictions
     */

    // Handle check button click - main prediction logic
    checkButton.addEventListener('click', async () => {
        const inputValue = numberInput.value;
        if (inputValue.trim() === '') {
            resultText.textContent = 'Please enter a number.';
            return;
        }
        const number = parseInt(inputValue, 10);
        if (isNaN(number) || !Number.isInteger(Number(inputValue))) {
            resultText.textContent = 'Invalid input. Please enter an integer.';
            return;
        }
        if (!session) {
            resultText.textContent = 'Model not loaded yet. Please wait.';
            return;
        } resultText.textContent = 'AI is thinking...';

        try {
            /**
             * Feature Engineering (Must match training data)
             * Extract last digit and create the same features as the notebook:
             * - Feature 1: Normalized last digit (lastDigit / 9.0)
             * - Feature 2: Is odd digit (lastDigit % 2) 
             * - Feature 3: Scaled last digit (lastDigit / 10.0)
             */
            const lastDigit = Math.abs(number) % 10;
            const normalizedLastDigit = lastDigit / 9.0;
            const isOddDigit = lastDigit % 2;
            const scaledLastDigit = lastDigit / 10.0;

            // Create input tensor with the same features as training
            const inputTensor = new ort.Tensor('float32', new Float32Array([normalizedLastDigit, isOddDigit, scaledLastDigit]), [1, 3]);
            const feeds = {
                'input': inputTensor
            }; const results = await session.run(feeds);
            const outputTensor = results.output;
            const outputData = outputTensor.data;

            /**
             * Determine if even or odd based on the AI model output
             * Model architecture from notebook outputs a single probability value:
             * - Values > 0.5 indicate "Odd" 
             * - Values <= 0.5 indicate "Even"
             */
            let prediction = '';
            if (outputData.length === 2) { // Two output probabilities: [prob_even, prob_odd]
                if (outputData[0] > outputData[1]) {
                    prediction = 'Even';
                } else {
                    prediction = 'Odd';
                }
            } else if (outputData.length === 1) { // Single output value
                // Based on the notebook, the model outputs:
                // > 0.5 for odd numbers
                // <= 0.5 for even numbers
                prediction = outputData[0] > 0.5 ? 'Odd' : 'Even';

                // Calculate and display confidence
                const confidence = Math.abs(outputData[0] - 0.5) * 2; // Convert to 0-1 scale
                console.log(`Confidence: ${(confidence * 100).toFixed(1)}%`);
            } else {
                prediction = "Couldn't determine (unexpected output format)";
            }

            // Debug information for troubleshooting
            console.log(`Last digit: ${lastDigit}, Prediction: ${prediction}, Output data:`, outputData);

            resultText.textContent = `The AI says ${number} is ${prediction}.`;
        } catch (e) {
            console.error(`Error during AI inference: ${e}`);
            resultText.textContent = 'Error during AI processing. Check console.';
        }
    });
});