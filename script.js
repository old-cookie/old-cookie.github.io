const Blob = document.querySelector('#blob');

const topLeft = document.querySelector('#topLeft');
topLeft.addEventListener('input', e => {
  Blob.style.setProperty('--topLeft', topLeft.value);
});

const topLeft2 = document.querySelector('#topLeft2');
topLeft2.addEventListener('input', e => {
  Blob.style.setProperty('--topLeft2', topLeft2.value);
});

const topRight = document.querySelector('#topRight');
topRight.addEventListener('input', e => {
  Blob.style.setProperty('--topRight', topRight.value);
});

const topRight2 = document.querySelector('#topRight2');
topRight2.addEventListener('input', e => {
  Blob.style.setProperty('--topRight2', topRight2.value);
});

const bottomRight = document.querySelector('#bottomRight');
bottomRight.addEventListener('input', e => {
  Blob.style.setProperty('--bottomRight', bottomRight.value);
});

const bottomRight2 = document.querySelector('#bottomRight2');
bottomRight2.addEventListener('input', e => {
  Blob.style.setProperty('--bottomRight2', bottomRight2.value);
});

const bottomLeft = document.querySelector('#bottomLeft');
bottomLeft.addEventListener('input', e => {
  Blob.style.setProperty('--bottomLeft', bottomLeft.value);
});

const bottomLeft2 = document.querySelector('#bottomLeft2');
bottomLeft2.addEventListener('input', e => {
  Blob.style.setProperty('--bottomLeft2', bottomLeft2.value);
});

const blobHeight = document.querySelector('#height');
blobHeight.addEventListener('input', e => {
  Blob.style.setProperty('--blobHeight', blobHeight.value);
});

const blobWidth = document.querySelector('#width');
blobWidth.addEventListener('input', e => {
  Blob.style.setProperty('--blobWidth', blobWidth.value);
});


document.querySelectorAll('.radius').forEach(element => {
  element.addEventListener('change', function () {
    var radius = window.getComputedStyle(Blob).getPropertyValue('border-radius');
    document.querySelector("#result").innerHTML = "Border Radius: <span style='color:" +
      radius + ";'>" + radius + "</span>";
  });
});