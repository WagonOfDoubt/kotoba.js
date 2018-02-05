const du = require('du');
const fs = require('fs');
const path = require('path');


const dirStats = async (rootDir) => {
  let stats = await ls(rootDir);
  stats = await Promise.all(stats.map(async (dirstat) => {
    dirstat.children = await ls(dirstat.dir);
    return dirstat;
  }));
  return stats;
};


const ls = (rootDir) => {
  return new Promise((resolve, reject) => {
    fs.readdir(rootDir, async (err, files) => {
      if (err) {
        reject(err);
      }
      files = files
        .filter(filename => !filename.startsWith('.'))
        .map(filename => {
          return {
            dirname: filename,
            dir: path.join(rootDir, filename)
          };
        })
        .filter(({dirname, dir}) => fs.statSync(dir).isDirectory());
      files = await Promise.all(files.map(getDirSize));
      resolve(files);
    });
  });
};


const getDirSize = ({dirname, dir}) => {
  return new Promise((resolve, reject) =>
    du(dir, (err, size) =>{
      if (err) {
        reject(err);
        return;
      }
      resolve({
        dirname: dirname,
        dir: dir,
        size: size,
        files: fs.readdirSync(dir)
          .map(filename => path.join(dir, filename))
          .filter(dir => fs.statSync(dir))
          .length
      });
    })
  );
};

module.exports = dirStats;
