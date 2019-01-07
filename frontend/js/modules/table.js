import $ from 'jquery';

const isSeparator = (el) => el.classList.contains('table__row_separator');
const isOmitted = (el) => el.classList.contains('table__row_omitted');
const isNormalRow = (el) => !isSeparator(el) && !isOmitted(el);
const weightRowType = (el) => isSeparator(el) ? 1 : isOmitted(el) ? 2 : 0;


const sortTable = (th) => {
  const $table = $(th).closest('table');
  const $tbody = $table.find('tbody');
  const $rows = $tbody.find('tr');

  const { sortField, sortType } = th.dataset;
  let sortOrder = th.dataset.sortOrder || 'ascending';
  sortOrder = sortOrder === 'ascending' ? 'descending' : 'ascending';

  $table
    .find('.table__header_sortable')
    .removeClass('table__header_sort-ascending table__header_sort-descending');
  th.dataset.sortOrder = sortOrder;
  th.classList.toggle('table__header_sort-ascending', sortOrder === 'ascending');
  th.classList.toggle('table__header_sort-descending', sortOrder === 'descending');

  const compareFunc = (a, b) => {
    const bothOmitted = isOmitted(a) && isOmitted(b);
    const bothNormal = isNormalRow(a) && isNormalRow(b);
    if (bothOmitted || bothNormal) {
      const aValue = a.dataset[sortField];
      const bValue = b.dataset[sortField];
      let ret = 0;
      if (sortType === 'date') {
        ret = Date.parse(aValue) - Date.parse(bValue);
      } else if (sortType === 'number') {
        ret = parseInt(aValue) - parseInt(bValue);
      } else if (sortType === 'string') {
        ret = aValue.localeCompare(bValue);
      } else {
        ret = a > b ? 1 : a < b ? -1 : 0;
      }
      if (sortOrder === 'descending') {
        ret = -ret;
      }
      return ret;
    } else {
      return weightRowType(a) - weightRowType(b);
    }
  };
  const $sortedRows = $rows.sort(compareFunc);
  $tbody.empty();
  $tbody.append($sortedRows);
};


export const initTables = () => {
  $('body').on('click', '.table__header_sortable', (e) => {
    const th = e.target;
    sortTable(th);
    e.preventDefault();
  });
};
