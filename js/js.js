function startUp() {
  if (localStorage.length >= 1) {

  document.querySelector('.outputTable').innerHTML = '';

  for (var index = 0; index < localStorage.length; index++) {
    var key = localStorage.key(index);
    var value = localStorage.getItem(key);
    showCard(key, JSON.parse(value));
  }
}
}



function saveDataClicked(evt) {
  evt.preventDefault();

  var memo = {};

  var now = new Date();

  memo.dateNow = `${now.getDate()}-${now.getMonth()+1}-${now.getYear()-100}`;

  var keyInput = document.querySelector('#keyInput');

  var valueInput = document.querySelector('#valueInput');

  var key = keyInput.value;

  memo.value = valueInput.value;

  localStorage.setItem(key, JSON.stringify(memo));
  document.querySelector('.outputTable').innerHTML = '';

  for (var index = 0; index < localStorage.length; index++) {
    var key = localStorage.key(index);
    var value = localStorage.getItem(key);
    showCard(key, JSON.parse(value));
  }
};

/* seperate function
function loadDataClicked(evt) {
  evt.preventDefault();
  document.querySelector('.outputTable').innerHTML = '';

for (var index = 0; index < localStorage.length; index++) {
  var key = localStorage.key(index);
  var value = localStorage.getItem(key);
  console.log(`${key}: ${value}`);
  showCard(key, value);
}
}
*/

function deleteClicked(evt) {
  localStorage.removeItem(evt.target.dataset.key);
  evt.preventDefault();
  document.querySelector('.outputTable').innerHTML = '';

for (var index = 0; index < localStorage.length; index++) {
  var key = localStorage.key(index);
  var value = localStorage.getItem(key);
  console.log(`${key}: ${value}`);
  showCard(key, JSON.parse(value));
}

}

function showCard(key, value) {

  var col = document.createElement('tr')

  var card = document.createElement('div');
  card.className = "hpcard";

  var cardHeading = document.createElement('h4');
  cardHeading.className = "txt_center";
  cardHeading.innerHTML = key;

  var cardContent = document.createElement('div');
  cardContent.className = "hpcontainer";
  cardContent.innerHTML = value;

  var buttonCenter = document.createElement('center');

  var deleteButton = document.createElement('button');
  deleteButton.className = 'hpbutton';
  deleteButton.innerHTML = 'Delete memo';
  deleteButton.dataset.key = key;
  deleteButton.addEventListener('click', deleteClicked);

  buttonCenter.appendChild(deleteButton)
  card.appendChild(cardHeading);
  card.appendChild(cardContent);
  card.appendChild(buttonCenter)
  col.appendChild(card)

  document.querySelector('.outputTable').appendChild(col);
  return col;
}

document.getElementById('saveBtn').addEventListener('click', saveDataClicked);

/*
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('sw.js').then(function(registration) {
      // Registration was successful
      console.log('ServiceWorker registration successful with scope: ', registration.scope);
    }, function(err) {
      // registration failed :(
      console.log('ServiceWorker registration failed: ', err);
    });
  });
}
*/
