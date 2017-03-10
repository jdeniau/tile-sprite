const fs = require('fs');
const exec = require('child_process').exec;

const FILE_REGEX = new RegExp('(.*)\-([0-9]+)-([0-9]+)\.(png|jpg|jpeg|gif)$');

function extractGroups(fileList) {
  const groupList = fileList
    .map(file => file.match(FILE_REGEX))
    .filter(f => !!f)
    .map(f => f[1])
    .filter((value, key, list) => list.indexOf(value) === key)
  ;

  const out = {};

  groupList.forEach(group => {
    out[group] = fileList.filter(file => file.startsWith(`${group}-`));
  });

  return out;
}

function generateGroupCommand(groupData) {
  return Object.entries(groupData)
    .map(([group, fileList]) => {
      const fileListString = fileList
        .map(file => {
          const [filename, group, col, row] = file.match(FILE_REGEX);
          return `${file} -geometry +${parseInt(row, 10) * 64}+${parseInt(col, 10) * 64} -composite`;
        })
        .join(' ')
      ;


      const dimensions = fileList.reduce((out, file) => {
        const [filename, group, col, row] = file.match(FILE_REGEX);
        const col64 = parseInt(col, 10) * 64;
        const row64 = parseInt(row, 10) * 64;

        if (col64 > out.col) {
          out.col = col64;
        }
        if (row64 > out.row) {
          out.row = row64;
        }

        return out;
      }, {row: 0, col: 0});

      return `convert -size ${dimensions.row + 128}x${dimensions.col + 128} xc:transparent ${fileListString} intermediate/${group}.png`;
    })
  ;
}


if (!fs.existsSync('intermediate')) {
  fs.mkdirSync('intermediate');
}
if (!fs.existsSync('out')) {
  fs.mkdirSync('out');
}

const imageList = fs.readdirSync('img/')
  .filter(image => image.match(/\.(gif|jpg|jpeg|png)$/))
;
const imageGroupList = extractGroups(imageList);

const commandList = generateGroupCommand(imageGroupList);


Promise.all(commandList.map(command => exec(command)))
  .then(() => {

    const groupList = Object.keys(imageGroupList)
      .map(group => `intermediate/${group}.png`)
    ;

    const command = `convert ${groupList.join(' ')} -append out/out.png`;
    return exec(command);
  })
;
