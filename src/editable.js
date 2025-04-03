import './editable.css'

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
	 * @param {HTMLElement} tbody
	 * @param {Array<string>} colDefs
	 * @param {Array<string>} pinnedColumns
	 * @param {Object} value
	 */
	createRow(tbody, colDefs, value) {
		const tr = document.createElement('tr');
		colDefs.forEach(col => {
			if (!col.pinned) {
				const td = document.createElement('td');
				td.innerText = value[col[columnFieldProperty] || col[columnNameProperty] || col];
				td.tabIndex = 0;
				td.addEventListener('focus', evt => this.onfocus(evt));
				td.addEventListener('blur', evt => this.onblur(evt));
				td.addEventListener('pointerdown', evt => this.onPointerDown(evt));
				td.addEventListener('click', evt => this.onClick(evt));
				tr.appendChild(td);
			}
		});
		tbody.appendChild(tr);
	}

	onPointerDown(evt) {
		console.log('pointerdown', this.editing);
		if (evt.target == this.currentCell && this.editing) {
			return;
		}
		evt.preventDefault();
	}

	onClick(evt) {
		console.log('click', evt.target.textContent, this.currentCell?.textContent);
		if (this.currentCell == null || evt.target != this.currentCell) {
			this.setCurrentCell(getParentElement(evt.target, 'td'));
		}
	}

	/**
	 * @param {HTMLElement} table
	 * @param {Array<string>} colDefs
	 * @param {Array<string>} pinnedColumns
	 * @param {Array<Object>} values
	 * @returns {HTMLElement}
	 */
	createMainColumns(colDefs, values) {
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
		values.forEach(v => {
			this.createRow(tbody, colDefs, v);
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
	createRowHeader(colDefs, values) {
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

	/**
	 * @param {HTMLElement} container
	 * @param {Array<string>} colDefs
	 * @param {Array<string>} rowHeaders
	 * @param {Array<Object>} values
	 * @returns {HTMLElement}
	 */
	constructor(container, colDefs, values) {
		/** @type {HTMLElement} */
		this.container = container;
		this.columns = colDefs;
		this.values = values;
		this.fields = colDefs.filter(v => !v.pinned).map(v => v[columnFieldProperty] || v[columnNameProperty] || v);
		const rowheaderc = document.createElement('div');
		const rowheader = this.createRowHeader(colDefs, values);
		rowheader.classList.add('row-header');
		rowheaderc.appendChild(rowheader);
		container.appendChild(rowheaderc);

		const mainc = document.createElement('div');
		mainc.classList.add('table-body');
		const main = this.createMainColumns(colDefs, values);
		mainc.appendChild(main);
		container.appendChild(mainc);
		container.classList.add('editable-table');

		/** @type {ES_EDIT|ES_IMMEDIATE|ES_NONE} */
		this.editState = ES_NONE;
		/** @type {String} */
		this.currentCellStore = '';
		/** @type {HTMLElement} */
		this.currentCell = null;
		/** @type {Boolean} */
		this.isComposing = false;
		/** @type {HTMLElement} */
		this.table = main;
		this.values = values;
		/** @type {String} Chromeのバグなのか、IMEで変換中に確定せずに別のセルをクリックすると、よくわからない文字列が入力される現象を回避するために使う。 */
		this.lastComposedText = null;

		this.onValueChanged = null;

		main.addEventListener('keydown', evt => this.onKeyDown(evt));
		main.addEventListener('compositionstart', evt => this.onCompositionStart(evt));
		main.addEventListener('compositionend', evt => this.onCompositionEnd(evt));
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
			this.setCurrentCell(nextcell);
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
			this.setCurrentCell(nextcell);
			return true;
		} else {
			return false;
		}
	}

	gotoFirstColumn() {
		const sel = document.getSelection();
		const currentrow = getParentElement(this.currentCell, 'tr');
		this.setCurrentCell(currentrow.firstElementChild);
	}

	gotoLastColumn() {
		const sel = document.getSelection();
		const currentrow = getParentElement(this.currentCell, 'tr');
		this.setCurrentCell(currentrow.lastElementChild);
	}

	/** @param {HTMLElement} elm */
	setCurrentCell(elm) {
		if (this.currentCell != null) {
			this.currentCell.classList.remove(currentCellClassName);
			if (this.currentCell != elm) {
				if (this.editing) {
					this.endEditing();
				}
			}
			this.currentCell.contentEditable = false;
		}
		this.currentCell = elm;
		if (elm != null) {
			elm.contentEditable = true;
			const sel = document.getSelection();
			const range = document.createRange();

			range.setStart(elm, 0);
			range.collapse(true);

			sel.removeAllRanges();
			sel.addRange(range);

			elm.classList.add(currentCellClassName);

			elm.scrollIntoView({ behavior: 'auto', block: 'nearest', inline: 'nearest' });
		}
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

		// Chromeで変換中の確定前に別セルをクリックした場合の減少への対処。直前の変換結果でセルの内容を上書きする。
		const newvalue = this.lastComposedText ?? this.currentCell.textContent;
		const oldvalue = this.currentCellStore;
		if (newvalue !== oldvalue) {
			console.log('changed');
			const row = getParentElement(this.currentCell, 'tr');
			const columnindex = getElementIndex(row, this.currentCell);
			const tbody = getParentElement(row, 'tbody');
			const rowindex = getElementIndex(tbody, row);

			const value = this.values[rowindex];
			const field = this.fields[columnindex];
			this.onValueChanged && this.onValueChanged(value, field, rowindex, columnindex, newvalue, oldvalue);
			// TODO 返り値をチェックしてfalueならバリデーション失敗
		}

		this.currentCell.textContent = newvalue;

		this.lastComposedText = null;
		this.currentCellStore = '';
		this.editState = ES_NONE;
		this.table.classList.remove(cellEditingClassName);
	}

	get editing() {
		return this.editState === ES_EDIT || this.editState === ES_IMMEDIATE;
	}

	/** @param {KeyboardEvent} evt*/
	onKeyDown(evt) {
		console.log(this.isComposing, this.editing, evt.key, evt.code);

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
				this.lastComposedText = null;

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
				this.lastComposedText = null;

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

	onCompositionStart() {
		console.log('composition start', this.editState, this.editing);
		this.isComposing = true;
		this.lastComposedText = null;
		if (this.editState === ES_NONE) {
			this.startEditing(true);
		}
	}

	onCompositionEnd() {
		console.log('composition end', this.editState, this.editing, this.currentCell.textContent);
		this.isComposing = false;
		// 変換が終わった時点でのセルの内容を保存しておく。
		this.lastComposedText = this.currentCell.textContent;
	}

	onfocus(evt) {
		console.log('focusin', this.currentCell);
		this.setCurrentCell(evt.target);
	}

	onblur(evt) {
		console.log('focusout', this.currentCell?.textContent);
		this.setCurrentCell(null);
	}
}

export { EditableTable };
