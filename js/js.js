function loadDataClicked(evt) {
  evt.preventDefault();
  document
    .querySelector('.outputTable')
    .innerHTML = '';

for (var index = 0; index < localStorage.length; index++) {
  var key = localStorage.key(index);
  var value = localStorage.getItem(key);
  console.log(`${key}: ${value}`);
  showRow(key, value);
}
}

function deleteClicked(evt) {
  var key = evt.target.dataset.key;

  // Write code here

}

function showRow(key, value) {
  var keyCell = document.createElement('td');
  keyCell.innerHTML = key;
  var valueCell = document.createElement('td');
  valueCell.innerHTML = value;
  var deleteRow = document.createElement('td');
  var deleteButton = document.createElement('button');
  deleteButton.class = 'delBtn';
  deleteButton.innerHTML = 'delete';
  deleteButton.dataset.key = key;
  deleteButton.addEventListener('click', deleteClicked);
  deleteRow.appendChild(deleteButton);
  var row = document.createElement('tr');
  row.appendChild(keyCell);
  row.appendChild(valueCell);
  row.appendChild(deleteRow);

  document
    .querySelector('.outputTable')
    .appendChild(row);
  return row;
}

document
  .getElementById('saveBtn')
  .addEventListener('click', saveDataClicked);

document
  .getElementById('loadBtn')
  .addEventListener('click', loadDataClicked);
