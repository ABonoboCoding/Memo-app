if (localStorage.length >= 1) {

  document.querySelector('.outputTable').innerHTML = '';

  const memos = [];

  for (var index = 0; index < localStorage.length; index++) {
    var key = localStorage.key(index);
    var value = JSON.parse(localStorage.getItem(key));
    console.log(index, key, value)
    memos.push({title: key, body: value});
  }

  memos.sort((a, b) => a.body[3] < b.body[3]).forEach((item) => {
      showCard(item.title, item.body)
    });
  document.getElementById("firstButton").style.display = "none";
};

if (localStorage.length < 1) {
  document.getElementById("firstButton").style.display = "block";
  };


function saveDataClicked(evt) {
  evt.preventDefault();

  var now = new Date();

  var key = `${now}`;

  var lastModify = `${now}`;

  var dateNow = `Last modified: ${now.getDate()}-${now.getMonth()+1}-${now.getYear()-100}`;

  var titleInput = document.querySelector('#titleInput');

  var valueInput = document.querySelector('#valueInput');

  var title = titleInput.value;

  var info = valueInput.value;

  var memo = [info, dateNow, title, lastModify
  ];

  localStorage.setItem(key, JSON.stringify(memo));

  document.querySelector('.outputTable').innerHTML = '';

  const memos = [];

  for (var index = 0; index < localStorage.length; index++) {
    var key = localStorage.key(index);
    var value = JSON.parse(localStorage.getItem(key));
    console.log(index, key, value)
    memos.push({title: key, body: value, modified: value[3]});
  }

  memos.sort((a, b) => a.body[3] < b.body[3]).forEach((item) => {
      showCard(item.title, item.body)
    });

  console.log(memos);

    var titleInput = document.querySelector('#titleInput');

    var valueInput = document.querySelector('#valueInput');

    titleInput.value = "";

    valueInput.value = "";

  window.location.href = '';
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
  evt.preventDefault();
  localStorage.removeItem(evt.target.dataset.key);
  document.querySelector('.outputTable').innerHTML = '';

  const memos = [];

for (var index = 0; index < localStorage.length; index++) {
  var key = localStorage.key(index);
  var value = JSON.parse(localStorage.getItem(key));
  console.log(index, key, value)
  memos.push({title: key, body: value});

  memos.sort((a, b) => a.body[3] < b.body[3]).forEach((item) => {
      showCard(item.title, item.body)
    });
}

if (localStorage.length < 1) {
  document.getElementById("firstButton").style.display = "block";
  };
};

function editClicked(evt) {
  var key = evt.target.dataset.key;
  var value = JSON.parse(localStorage.getItem(key));
  window.location.href = '#popup2';
  var title = document.querySelector("#titleInput2");
  var content = document.querySelector("#valueInput2");
  title.value = value[2];
  content.value = value[0];

  var saveEditButton = document.querySelector("#saveBtn2");
  saveEditButton.dataset.key = key;
};

function saveEdited(evt) {
  evt.preventDefault();

  var key = evt.target.dataset.key;

  var titleInput = document.querySelector('#titleInput2');

  var valueInput = document.querySelector('#valueInput2');

  var title = titleInput.value;

  var info = valueInput.value;

  var now = new Date();

  var lastModify = `${now}`;

  var dateNow = `Last modified: ${now.getDate()}-${now.getMonth()+1}-${now.getYear()-100}`;

  var memo = [info, dateNow, title, lastModify
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

  memos.sort((a, b) => a.body[3] < b.body[3]).forEach((item) => {
      showCard(item.title, item.body)
    });

  console.log(memos);

    var titleInput = document.querySelector('#titleInput');

    var valueInput = document.querySelector('#valueInput');

    titleInput.value = "";

    valueInput.value = "";

  window.location.href = '';

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

  /*var buttonCenter = document.createElement('center');*/

  var deleteButton = document.createElement('button');
  deleteButton.className = 'hpbutton';
  deleteButton.innerHTML = 'Delete';
  deleteButton.dataset.key = key;
  deleteButton.addEventListener('click', deleteClicked);

  var editButton = document.createElement('button');
  editButton.className = 'hpbutton';
  editButton.innerHTML = 'Edit';
  editButton.dataset.key = key;
  editButton.addEventListener('click', editClicked);

  /*buttonCenter.appendChild(deleteButton)*/

  datePara.appendChild(cardDate)
  cardContent.appendChild(datePara);
  card.appendChild(cardHeading);
  card.appendChild(cardContent);
  card.appendChild(deleteButton);
  card.appendChild(editButton);
  col.appendChild(card);

  document.querySelector('.outputTable').appendChild(col);
  return col;
}

document.getElementById('saveBtn').addEventListener('click', saveDataClicked);
document.getElementById('saveBtn2').addEventListener('click', saveEdited);

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
