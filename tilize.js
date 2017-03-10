const fs = require('fs');
const exec = require('child_process').execSync;

const FILE_REGEX = new RegExp('([^-]*)(.*)?\-([0-9]+)-([0-9]+)\.(png|jpg|jpeg|gif)$');
const IMAGE_PATH = process.argv[2] || 'img';

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
          const [filename, group, desc, row, col] = file.match(FILE_REGEX);
          return `${IMAGE_PATH}/${file} -geometry +${parseInt(row, 10) * 64}+${parseInt(col, 10) * 64} -composite`;
        })
        .join(' ')
      ;

      const dimensions = fileList.reduce((out, file) => {
        const [filename, group, desc, row, col] = file.match(FILE_REGEX);
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

      return `convert -size ${dimensions.row + 1024}x${dimensions.col + 1024} xc:transparent ${fileListString} -trim +repage intermediate/${group}.png`;
    })
  ;
}


if (!fs.existsSync('intermediate')) {
  fs.mkdirSync('intermediate');
} else {
  exec('rm intermediate/*')
}
if (!fs.existsSync('out')) {
  fs.mkdirSync('out');
} else {
  exec('rm out/*')
}

const imageList = fs.readdirSync(IMAGE_PATH)
  .filter(image => image.match(/\.(gif|jpg|jpeg|png)$/))
;

console.log(`${imageList.length} images found`);
const imageGroupList = extractGroups(imageList);
console.log(`${Object.keys(imageGroupList).length} groups created (${Object.keys(imageGroupList)})`);

const commandList = generateGroupCommand(imageGroupList);


Promise.all(commandList.map(command => exec(command)))
  .then(() => {

    const groupList = Object.keys(imageGroupList)
      .map(group => `intermediate/${group}.png`)
    ;

    const command = `convert -background transparent ${groupList.join(' ')} -append out/${IMAGE_PATH}.png`;
    return exec(command);
  })
;
