/**
 * @param {HTMLElement} elm
 * @param {number} offset
 * @returns {HTMLElement}
 */
const getNthSibling = (elm, offset) => {
	if (offset == 0) {
		return elm;
	} else if (offset > 0) {
		let next = elm;
		let n = 0;
		while (next != null && n < offset) {
			next = next.nextElementSibling;
			n++;
		}
		return next;
	} else if (offset < 0) {
		let prev = elm;
		let n = 0;
		while (prev != null && n > offset) {
			prev = prev.previousElementSibling;
			n--;
		}
		return prev;
	}
}

/**
 * @param {HTMLElement} elm
 * @param {number} index
 * @param {HTMLElement}
 */
const getNthChild = (elm, index) => {
	let cell = elm.firstElementChild;
	for (let i = 0; i < index && cell != null; i++) {
		cell = cell.nextElementSibling;
	}
	return cell;
}

/**
 * @param {HTMLElement} parent
 * @param {HTMLElement} child
 * @returns {number}
 */
const getElementIndex = (parent, child) => {
	let i = 0;
	let e = parent.firstElementChild;
	while (e != null && e != child) {
		e = e.nextElementSibling;
		i++;
	}
	if (e == null) {
		return NaN;
	}
	return i;
}

/**
 * @param {Selection} sel
 * @param {string} elmname
 * @returns {HTMLElement}
 */
const getElementAtCaret = (sel, elmname) => {
	let e = sel.anchorNode;
	const nm = elmname.toUpperCase();
	while (e != null && e.nodeName != nm) {
		e = e.parentElement;
	}
	return e;
}

/**
 * @param {Node} elm
 * @param {string} name
 * @returns {HTMLElement}
 */
const getParentElement = (elm, name) => {
	let e = elm;
	const nm = name.toUpperCase();
	while (e != null && e.nodeName != nm) {
		e = e.parentElement;
	}
	return e;
}

/**
 * @param {HTMLElement} tbody
 * @param {Array<string>} colDefs
 * @param {Array<string>} pinnedColumns
 * @param {Object} value
 */
const createRow = (tbody, colDefs, value) => {
	const tr = document.createElement('tr');
	colDefs.forEach(col => {
		if (!col.pinned) {
			const td = document.createElement('td');
			td.innerText = value[col[columnFieldProperty] || col[columnNameProperty] || col];
			tr.appendChild(td);
		}
	});
	tbody.appendChild(tr);
}
/**
 * @param {HTMLElement} table
 * @param {Array<string>} colDefs
 * @param {Array<string>} pinnedColumns
 * @param {Array<Object>} values
 * @returns {HTMLElement}
 */
const createMainColumns = (colDefs, values) => {
	const table = document.createElement('table');

	// create thead
	const tr = document.createElement('tr');
	colDefs.forEach(col => {
		if (!col.pinned) {
			const th = document.createElement('th');
			th.innerText = col.name || col;
			tr.appendChild(th);
		}
	});
	const thead = document.createElement('thead');
	thead.appendChild(tr);
	table.appendChild(thead);

	// create tbody
	const tbody = document.createElement('tbody');
	tbody.contentEditable = 'plaintext-only';
	values.forEach(v => {
		createRow(tbody, colDefs, v);
	});
	table.appendChild(tbody);

	return table;
}

/**
 * @param {Array<string>} colDefs
 * @param {Array<string>} pinnedColumns
 * @param {Array<Object>} values
 * @returns {HTMLElement}
 */
const createRowHeader = (colDefs, values) => {
	const table = document.createElement('table');
	const thead = document.createElement('thead');
	const tr = document.createElement('tr');
	colDefs.forEach(col => {
		if (col.pinned) {
			const th = document.createElement('th');
			th.innerText = col.name;
			tr.appendChild(th);
		}
	});
	thead.appendChild(tr);
	table.appendChild(thead);

	const tbody = document.createElement('tbody');
	values.forEach(value => {
		const tr = document.createElement('tr');
		colDefs.forEach(col => {
			if (col.pinned) {
				const td = document.createElement('th');
				td.innerText = value[col[columnFieldProperty] || col[columnNameProperty]];
				tr.appendChild(td);
			}
		});
		tbody.appendChild(tr);
	});
	table.appendChild(tbody);
	return table;
}

const currentCellClassName = 'current-cell';
const cellEditingClassName = 'editing';

const columnNameProperty = 'name';
const columnFieldProperty = 'field';

const ES_NONE = 0; // 非編集モード
const ES_IMMEDIATE = 1; // 即時編集モード
const ES_EDIT = 2; // 編集モード

class EditableTable {
	/*
	 * セルのクリックやカーソル移動でキャレット位置が変化する場合は、必ず、セルの中の先頭にキャレットを移動させる。
	 * そうしないとその後の日本語入力時に文字が入力される位置がずれる。(upDownCursor、leftRightCursor、onclick)
	 * 
	 * currentCellの変更はselectionchangeイベントハンドラで行う。他ではしない。
	 * キャレット位置を変化させるついでにcurrentCellを変えるのもダメ。
	 * キャレット位置を変更するとselectionchangeイベントが発生してそのイベントハンドラの中で変えるから。
	 */

	/**
	 * @param {HTMLElement} container
	 * @param {Array<string>} colDefs
	 * @param {Array<string>} rowHeaders
	 * @param {Array<Object>} values
	 * @returns {HTMLElement}
	 */
	constructor(container, colDefs, values) {
		this.container = container;
		this.columns = colDefs;
		this.values = values;
		this.fields = colDefs.filter(v => !v.pinned).map(v => v[columnFieldProperty] || v[columnNameProperty] || v);
		const rowheaderc = document.createElement('div');
		const rowheader = createRowHeader(colDefs, values);
		rowheader.classList.add('row-header');
		rowheaderc.appendChild(rowheader);
		container.appendChild(rowheaderc);

		const mainc = document.createElement('div');
		mainc.classList.add('table-body');
		const main = createMainColumns(colDefs, values);
		mainc.appendChild(main);
		container.appendChild(mainc);
		container.classList.add('editable-table');

		this.editState = ES_NONE;
		this.currentCellStore = '';
		this.currentCell = null;
		this.isComposing = false;
		this.table = main;
		this.values = values;

		this.onValueChanged = null;

		main.addEventListener('keydown', evt => this.onKeyDown(evt));
		main.addEventListener('compositionstart', evt => this.onCompositionStart(evt));
		main.addEventListener('compositionend', evt => this.onCompositionEnd(evt));
		document.addEventListener('selectionchange', evt => this.onSelectionChange(evt));
		main.addEventListener('focusin', evt => this.onfocusin(evt));
		main.addEventListener('focusout', evt => this.onfocusout(evt));
		main.addEventListener('click', evt => this.onclick(evt));
	}

	/**
	 * @param {number} dir
	 */
	upDownCursor(dir) {
		const sel = document.getSelection();
		const currentrow = this.currentCell.parentElement;
		const column = getElementIndex(currentrow, this.currentCell);
		const nextrow = getNthSibling(currentrow, dir);
		if (nextrow != null) {
			const nextcell = getNthChild(nextrow, column);

			const range = document.createRange();
			range.setStart(nextcell, 0);
			range.collapse(true);

			sel.removeAllRanges();
			sel.addRange(range);
			return true;
		} else {
			return false;
		}
	}

	/**
	 * @param {number} dir
	 */
	leftRightCursor(dir) {
		const sel = document.getSelection();
		const currentrow = this.currentCell.parentElement;
		const nextcell = getNthChild(currentrow, getElementIndex(currentrow, this.currentCell) + dir);
		if (nextcell != null) {
			const range = document.createRange();
			range.setStart(nextcell, 0);
			range.collapse(true);

			sel.removeAllRanges();
			sel.addRange(range);
			return true;
		} else {
			return false;
		}
	}

	gotoFirstColumn() {
		const sel = document.getSelection();
		const currentrow = getParentElement(this.currentCell, 'tr');
		const range = document.createRange();
		range.setStart(currentrow.firstElementChild.firstChild, 0);
		range.collapse(true);

		sel.removeAllRanges();
		sel.addRange(range);
	}

	gotoLastColumn() {
		const sel = document.getSelection();
		const currentrow = getParentElement(this.currentCell, 'tr');
		const range = document.createRange();
		range.setStart(currentrow.lastElementChild.firstChild, 0);
		range.collapse(true);

		sel.removeAllRanges();
		sel.addRange(range);
	}

	/** @param {Boolean} immediate */
	startEditing(immediate) {
		console.log('startEditing');

		const sel = document.getSelection();
		this.currentCellStore = this.currentCell.innerText;
		if (immediate) {
			this.currentCell.textContent = '';
			this.editState = ES_IMMEDIATE;
		} else {
			this.editState = ES_EDIT;
		}

		const range = document.createRange();
		if (this.currentCell.lastChild == null) {
			range.setStart(this.currentCell, 0);
		} else {
			range.setStart(this.currentCell.lastChild, this.currentCell.lastChild.textContent.length);
		}
		range.collapse(true);

		sel.removeAllRanges();
		sel.addRange(range);

		this.table.classList.add(cellEditingClassName);
	}

	cancelEditing() {
		console.log('cancelEditing');

		this.currentCell.innerText = this.currentCellStore;
		this.currentCellStore = '';
		this.editState = ES_NONE;
		this.table.classList.remove(cellEditingClassName);
	}

	endEditing() {
		console.log('endEditing');

		const newvalue = this.currentCell.textContent;
		const oldvalue = this.currentCellStore;
		if (newvalue !== oldvalue) {
			console.log('changed');
			const row = getParentElement(this.currentCell, 'tr');
			const columnindex = getElementIndex(row, this.currentCell);
			const tbody = getParentElement(row, 'tbody');
			const rowindex = getElementIndex(tbody, row);

			//console.log(rowindex, columnindex);
			const value = this.values[rowindex];
			const field = this.fields[columnindex];
			this.onValueChanged && this.onValueChanged(value, field, rowindex, columnindex, newvalue, oldvalue);
			// TODO 返り値をチェックしてfalueならバリデーション失敗
		}

		this.currentCellStore = '';
		this.editState = ES_NONE;
		this.table.classList.remove(cellEditingClassName);
	}

	get editing() {
		return this.editState === ES_EDIT || this.editState === ES_IMMEDIATE;
	}

	/** @param {KeyboardEvent} evt*/
	onKeyDown(evt) {
		console.log(this.editState, this.editing, evt.key, evt.code);

		switch (this.editState) {
			case ES_EDIT: // 編集モードの処理
				if (evt.isComposing) {
					/*
					 * WindowsのIMEの問題なのか、変換中でもカーソルキーでカーソルが動いてしまうことがあるので抑制する。
					 * evt.keyがProcess以外の場合は処理を抑制する。
					 */
					if (evt.key !== 'Process') {
						evt.preventDefault();
					}
					// 変換中の残りの処理はブラウザまかせ
					return;
				}

				if (evt.key.length === 1) { // 印字可能なキー
					// 入力されたキーのDOMツリーへの挿入はブラウザまかせ
					// TODO ctrl,alt,shiftキーが押されていた場合の処理
					return;
				} else if (evt.key === 'Delete' || evt.key === 'Backspace') {
					// DeleteとBackspaceはブラウザまかせ
					return;
				}

				if (evt.key === 'ArrowLeft') {
					const sel = document.getSelection();
					// セルの先頭までカーソルが来ていたらそれ以上カーソル移動させない。
					if (sel.focusNode == this.currentCell.firstChild && sel.focusOffset == 0) {
						evt.preventDefault();
					}
				} else if (evt.key === 'ArrowRight') {
					const sel = document.getSelection();
					// セルの末尾までカーソルが来ていたらそれ以上カーソル移動させない。
					if (sel.focusNode == this.currentCell.lastChild && sel.focusOffset == this.currentCell.lastChild.textContent.length) {
						evt.preventDefault();
					}
				} else {
					evt.preventDefault();
					switch (evt.key) {
						case 'Escape':
							this.cancelEditing();
							break;
						case 'Enter':
							if (!this.upDownCursor(1)) {
								this.endEditing();
							}
							break;
						case 'Tab':
							if (!this.leftRightCursor(1)) {
								this.endEditing();
							}
							break;
						case 'Home':
							{
								// セルの先頭までカーソルを移動
								const sel = document.getSelection();

								const range = document.createRange();
								range.setStart(this.currentCell.firstChild, 0);
								range.collapse(true);

								sel.removeAllRanges();
								sel.addRange(range);
							}
							break;
						case 'End':
							{
								// セルの末尾までカーソルを移動
								const sel = document.getSelection();

								const range = document.createRange();
								range.setStart(this.currentCell.lastChild, this.currentCell.lastChild.textContent.length);
								range.collapse(true);

								sel.removeAllRanges();
								sel.addRange(range);
							}
							break;
					}
				}
				break;

			case ES_IMMEDIATE: // 即時編集モードの処理
				// ちょっとExcelと違う。ExcelはIMEがONで変換候補が出ていないときはカーソルキーで上下のセルに移動できる。
				if (evt.isComposing) {
					/*
					 * WindowsのIMEの問題なのか、変換中でもカーソルキーでカーソルが動いてしまうことがあるので抑制する。
					 * evt.keyがProcess以外の場合は処理を抑制する。
					 */
					if (evt.key !== 'Process') {
						evt.preventDefault();
					}
					// 変換中の残りの処理はブラウザまかせ
					return;
				}

				if (evt.key.length === 1) { // 印字可能なキー
					// 入力されたキーのDOMツリーへの挿入はブラウザまかせ
					// TODO ctrl,alt,shiftキーが押されていた場合の処理
					return;
				} else if (evt.key === 'Backspace') {
					// Backspaceはブラウザまかせ
					return;
				}

				evt.preventDefault();
				switch (evt.key) {
					case 'Escape':
						this.cancelEditing();
						break;
					case 'Enter':
						if (!this.upDownCursor(1)) {
							this.endEditing();
						}
						break;
					case 'Tab':
						if (!this.leftRightCursor(1)) {
							this.endEditing();
						}
						break;
					case 'ArrowUp':
						this.upDownCursor(-1);
						break;
					case 'ArrowDown':
						this.upDownCursor(1);
						break;
					case 'ArrowLeft':
						this.leftRightCursor(-1);
						break;
					case 'ArrowRight':
						this.leftRightCursor(1);
						break;
					case 'Home':
						this.gotoFirstColumn();
						break;
					case 'End':
						this.gotoLastColumn();
				}
				break;

			case ES_NONE: // 非編集モードの処理
				if (evt.key.length === 1) { // 印字可能なキー

					// 非編集モードで印字可能なキーが押されたら、即時編集モードにする。
					// 入力されたキーのDOMツリーへの挿入はブラウザまかせ
					// TODO ctrl,alt,shiftキーが押されていた場合の処理

					// evt.key === 'Process'の場合もstartEditing呼ぶようにしたら、
					// 一文字目が全角で確定された状態で入力されたのでやめた。

					this.startEditing(true);
					return;
				}

				evt.preventDefault();
				switch (evt.key) {
					case 'ArrowUp':
						this.upDownCursor(-1);
						break;
					case 'ArrowDown':
						this.upDownCursor(1);
						break;
					case 'ArrowLeft':
						this.leftRightCursor(-1);
						break;
					case 'ArrowRight':
						this.leftRightCursor(1);
						break;
					case 'F2':
						// F2が押されたら編集モードにする。
						this.startEditing(false);
						break;
					case 'Tab':
						this.leftRightCursor(1);
						break;
					case 'Enter':
						this.upDownCursor(1);
						break;
					case 'Home':
						this.gotoFirstColumn();
						break;
					case 'End':
						this.gotoLastColumn();
						break;
					case 'Delete':
						this.currentCell.innerText = '';
						break;
					case 'Backspace':
						// Backspaceが押されたら即時編集モードにする。
						this.startEditing(true);
				}
				break;
		}
	}

	onSelectionChange(evt) {
		const sel = document.getSelection();

		const targetTable = getParentElement(sel.focusNode, 'table');
		if (targetTable == null || targetTable != this.table) {
			return;
		}

		if (this.isComposing) {
			return;
		}

		console.log('onSelectionChange', this.editState, this.editing, sel.focusOffset);

		const targetCell = getParentElement(sel.focusNode, 'td');
		if (this.currentCell != null) {
			if (this.currentCell != targetCell) {
				if (this.editing) {
					this.endEditing();
				}
			}
			this.currentCell.classList.remove(currentCellClassName);
		}
		if (targetCell != null) {
			targetCell.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
			targetCell.classList.add(currentCellClassName);
		}
		this.currentCell = targetCell;
	}

	onCompositionStart() {
		console.log('composition start', this.editState, this.editing);
		this.isComposing = true;
		if (this.editState === ES_NONE) {
			this.startEditing(true);
		}
	}

	onCompositionEnd() {
		console.log('composition end', this.editState, this.editing, this.currentCell.textContent);
		this.isComposing = false;
	}

	onfocusin(evt) {
		console.log('focusin');
	}

	onfocusout(evt) {
		console.log('focusout', this.currentCell.textContent);
		if (this.editing) {
			this.endEditing();
		}
	}

	onclick(evt) {
		console.log('onclick', this.editing);
		if (!this.editing) {
			const cell = getParentElement(evt.target, 'td');
			const sel = document.getSelection();
			const range = document.createRange();
			range.setStart(cell, 0);
			range.collapse(true);

			sel.removeAllRanges();
			sel.addRange(range);
		}
		// TODO マウスドラッグによる編集中セル内の選択
	}
}

export { EditableTable };
