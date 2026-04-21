const TIME_SERVICE = 'ebe0ccb0-7a0a-4b0c-8a1a-6ff2997da3a6';
const TIME = 'ebe0ccb7-7a0a-4b0c-8a1a-6ff2997da3a6';
const UNIT = 'ebe0ccbe-7a0a-4b0c-8a1a-6ff2997da3a6';

// Refresh the on-page clock every second.
startCurrentTimeClock();
function startCurrentTimeClock() {
    updateCurrentTimeDisplay();
    setInterval(updateCurrentTimeDisplay, 1000);
}
function updateCurrentTimeDisplay() {
    let currentTimeElement = document.getElementById('currentTime');
    if (!currentTimeElement) {
        return;
    }
    currentTimeElement.textContent = new Date().toLocaleTimeString([], {
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}
function updateTime() {
    setSyncBusy(true);
    Promise.resolve()
        .then(function () {
            return getCharecteristics(TIME_SERVICE, TIME);
        })
        .then(function (characteristic) {
            notify('Writting time value...')
            return characteristic.writeValue(getCurrentTime());
        })
        .then(function () {
            notify('Time updated.');
        })
        .catch(function (error) {
            notify(error);
        })
        .finally(function () {
            setSyncBusy(false);
        });
}
function updateUnit() {
    let unitValue = parseInt(document.querySelector('input[name="unit"]:checked').value);
    let charPromise = getCharecteristics(TIME_SERVICE, UNIT);
    let readPromise = charPromise.then(c => c.readValue());
    Promise.all([charPromise, readPromise])
        .then(function ([characteristic, value]) {
            let oldValue = value.getUint8(0);
            notify('Writting unit value (' + oldValue + ' -> ' + unitValue + ')...')

            let buffer = new ArrayBuffer(1);
            new DataView(buffer).setUint8(0, unitValue);

            return characteristic.writeValue(buffer);
        }).then(function () {
            notify('Unit updated');
        }).catch(function (error) {
            notify(error);
        });
}
function getCharecteristics(service, characteristic) {
    if (!('bluetooth' in navigator)) {
        throw 'Bluetooth API not supported.';
    }
    let options = {
        filters: [{ namePrefix: 'LYWSD02' }],
        optionalServices: [service]
    };
    return navigator.bluetooth.requestDevice(options)
        .then(function (device) {
            notify('Connecting...')
            return device.gatt.connect();
        })
        .then(function (server) {
            notify('Getting primary service...')
            return server.getPrimaryService(service);
        })
        .then(function (service) {
            notify('Getting characteristic...')
            return service.getCharacteristic(characteristic);
        });
}
function notify(message) {
    let text = String(message);
    let options;

    // Map known message patterns to Oat toast variants.
    if (/error/i.test(text)) {
        options = { variant: 'danger' };
    } else if (text === 'Time updated.') {
        options = { variant: 'success' };
    }

    console.log(text);

    if (typeof ot !== 'undefined' && typeof ot.toast === 'function') {
        ot.toast(text, '', options);
        return;
    }
    window.alert(text);
}
function setSyncBusy(isBusy) {
    let button = document.getElementById('updateTimeButton');
    if (!button) {
        return;
    }
    // Use Oat's button spinner state while BLE sync is running.
    if (isBusy) {
        button.disabled = true;
        button.setAttribute('aria-busy', 'true');
        button.setAttribute('data-spinner', 'small');
        button.textContent = 'Loading';
        return;
    }
    button.disabled = false;
    button.removeAttribute('aria-busy');
    button.removeAttribute('data-spinner');
    button.textContent = 'Update time';
}
function getCurrentTime() {
    // The device stores zone as whole hours and local seconds separately.
    let offsetMinutes = -new Date().getTimezoneOffset();
    let zone = Math.trunc(offsetMinutes / 60);
    let extraOffsetSeconds = (offsetMinutes % 60) * 60;
    let dateTime = parseInt(Date.now() / 1000) + extraOffsetSeconds;
    let buffer = new ArrayBuffer(5);
    new DataView(buffer).setUint32(0, dateTime, true /* littleEndian */);
    new DataView(buffer).setUint8(4, zone);
    return buffer;
}
