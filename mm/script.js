// 💡 이름과 전화번호 열 위치를 인덱스로 설정 (0부터 시작)
// 예: C열 = 2, D열 = 3
const NAME_COLUMN_INDEX = 1;
const PHONE_COLUMN_INDEX = 2;

document.getElementById('excelFile').addEventListener('change', function (e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function (e) {
    const data = new Uint8Array(e.target.result);
    const workbook = XLSX.read(data, { type: 'array' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    displayTable(json);
  };
  reader.readAsArrayBuffer(file);
});

function displayTable(data) {
  if (data.length === 0) return;

  const container = document.getElementById('tableContainer');
  container.innerHTML = ''; // 초기화

  const table = document.createElement('table');
  const thead = document.createElement('thead');
  const tbody = document.createElement('tbody');

  // 헤더 행
  const headerRow = document.createElement('tr');
  ['이름', '이름 복사', '전화번호', '전화번호 복사'].forEach(text => {
    const th = document.createElement('th');
    th.textContent = text;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);

  // 데이터 행
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const name = row[NAME_COLUMN_INDEX] || '';
    const phone = row[PHONE_COLUMN_INDEX] || '';

    const tr = document.createElement('tr');

    // 이름 셀
    const nameTd = document.createElement('td');
    nameTd.textContent = name;
    tr.appendChild(nameTd);

    // 이름 복사 버튼
    const nameCopyTd = document.createElement('td');
    const nameBtn = document.createElement('button');
    nameBtn.className = 'copy-btn';
    nameBtn.textContent = '복사';
    nameBtn.addEventListener('click', () => copyToClipboard(name));
    nameCopyTd.appendChild(nameBtn);
    tr.appendChild(nameCopyTd);

    // 전화번호 셀
    const phoneTd = document.createElement('td');
    phoneTd.textContent = phone;
    tr.appendChild(phoneTd);

    // 전화번호 복사 버튼
    const phoneCopyTd = document.createElement('td');
    const phoneBtn = document.createElement('button');
    phoneBtn.className = 'copy-btn';
    phoneBtn.textContent = '복사';
    phoneBtn.addEventListener('click', () => copyToClipboard(phone));
    phoneCopyTd.appendChild(phoneBtn);
    tr.appendChild(phoneCopyTd);

    tbody.appendChild(tr);
  }

  table.appendChild(thead);
  table.appendChild(tbody);
  container.appendChild(table);
}

function copyToClipboard(text) {
  navigator.clipboard.writeText(text)
    .catch(err => console.error('복사 실패:', err));
}
