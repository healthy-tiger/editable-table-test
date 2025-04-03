import { EditableTable } from './editable.js'

const columns = [
    { name: 'name', pinned: true },
    'Breed',
    'Age',
    'Owner',
    'Eating Habits',
];

const dogs = [
    {
        'name': 'Knocky',
        'Breed': 'Jack Russell',
        'Age': 16,
        'Owner': 'Mother-in-law',
        'Eating Habits': 'Eats everyone\'s leftovers',
    },
    {
        'name': 'Flor',
        'Breed': 'Poodle',
        'Age': 9,
        'Owner': 'Me',
        'Eating Habits': 'Nibbles at food',
    },
    {
        'name': 'Ella',
        'Breed': 'Streetdog',
        'Age': 10,
        'Owner': 'Me',
        'Eating Habits': 'Hearty eater',
    },
    {
        'name': 'Juan',
        'Breed': 'Cocker Spaniel',
        'Age': 5,
        'Owner': 'Sister-in-law',
        'Eating Habits': 'Will eat till he explodes',
    },
];

const onValueChanged = (value, field, rowindex, columnindex, newvalue, oldvalue) => {
    console.log(`${rowindex}, ${columnindex}, "${field}", "${newvalue}", "${oldvalue}"`);
}

const editable = new EditableTable(document.querySelector('#dog-table'), columns, dogs);
editable.onValueChanged = onValueChanged;
