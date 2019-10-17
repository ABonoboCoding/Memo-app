if (localStorage.length >= 1) {

  document.querySelector('.outputTable').innerHTML = '';

  const memos = [];

  for (var index = 0; index < localStorage.length; index++) {
    var key = localStorage.key(index);
    var value = JSON.parse(localStorage.getItem(key));
    console.log(index, key, value)
    memos.push({title: key, body: value});
  }

  memos.sort((a, b) => a.title < b.title).forEach((item) => {
      showCard(item.title, item.body)
    });
  document.getElementById("firstButton").style.display = "none";
};


function saveDataClicked(evt) {
  evt.preventDefault();

  var now = new Date();

  var key = `${now}`;

  var dateNow = `${now.getDate()}-${now.getMonth()+1}-${now.getYear()-100}`;

  var titleInput = document.querySelector('#titleInput');

  var valueInput = document.querySelector('#valueInput');

  var title = titleInput.value;

  var info = valueInput.value;

  var memo = [info, dateNow, title
  ];

  localStorage.setItem(key, JSON.stringify(memo));

  document.querySelector('.outputTable').innerHTML = '';

  const memos = [];

  for (var index = 0; index < localStorage.length; index++) {
    var key = localStorage.key(index);
    var value = JSON.parse(localStorage.getItem(key));
    console.log(index, key, value)
    memos.push({title: key, body: value});
  }

  memos.sort((a, b) => a.title < b.title).forEach((item) => {
      showCard(item.title, item.body)
    });

    var titleInput = document.querySelector('#titleInput');

    var valueInput = document.querySelector('#valueInput');

    titleInput.value = "";

    valueInput.value = "";

  document.getElementById("firstButton").style.display = "none";
};

/* seperate function
function loadDataClicked(evt) {
  evt.preventDefault();
  document.querySelector('.outputTable').innerHTML = '';

  const memos = [];

  for (var index = 0; index < localStorage.length; index++) {
    var key = localStorage.key(index);
    var value = JSON.parse(localStorage.getItem(key));
    console.log(index, key, value)
    memos.push({title: key, body: value});
  }

  memos.sort((a, b) => a.title < b.title).forEach((item) => {
      showCard(item.title, item.body)
    });
}
}
*/

function deleteClicked(evt) {
  localStorage.removeItem(evt.target.dataset.key);
  evt.preventDefault();
  document.querySelector('.outputTable').innerHTML = '';

  const memos = [];

for (var index = 0; index < localStorage.length; index++) {
  var key = localStorage.key(index);
  var value = JSON.parse(localStorage.getItem(key));
  console.log(index, key, value)
  memos.push({title: key, body: value});

  memos.sort((a, b) => a.title < b.title).forEach((item) => {
      showCard(item.title, item.body)
    });
}

if (localStorage.length < 1) {
  document.getElementById("firstButton").style.display = "block";
  };

};

function showCard(key, value) {

  var col = document.createElement('tr')

  var card = document.createElement('div');
  card.className = "hpcard";

  var cardHeading = document.createElement('h2');
  cardHeading.className = "txt_center";
  cardHeading.innerHTML = value[2];

  var cardContent = document.createElement('div');
  cardContent.className = "hpcontainer";
  cardContent.innerHTML = value[0];

  var datePara = document.createElement('p');
  var cardDate = document.createElement('b');
  cardDate.innerHTML = value[1];

  var buttonCenter = document.createElement('center');

  var deleteButton = document.createElement('button');
  deleteButton.className = 'hpbutton';
  deleteButton.innerHTML = 'Delete memo';
  deleteButton.dataset.key = key;
  deleteButton.addEventListener('click', deleteClicked);

  buttonCenter.appendChild(deleteButton)

  datePara.appendChild(cardDate)
  cardContent.appendChild(datePara);
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
