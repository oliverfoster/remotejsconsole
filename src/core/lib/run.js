/*global document window */

export default async function run(command, silent) {
  return new Promise(async resolve => {
    const res = {
      error: false,
      command,
    };

    try {
      // // trick from devtools
      // // via https://chromium.googlesource.com/chromium/src.git/+/4fd348fdb9c0b3842829acdfb2b82c86dacd8e0a%5E%21/#F2
      if (/^\s*\{/.test(command) && /\}\s*$/.test(command)) {
        command = `(${command})`;
      }

      const isRemote = (window.eventSource);
      if (!isRemote) {
        res.error = true;
        res.value = new Error('Not connected to remote. Use :help command to :listen.');
        return resolve(res);
      }

      var remote = window.eventSource;
      var remoteId = remote.id;
      var xhr = new XMLHttpRequest();
      var params = 'data=' + encodeURIComponent(command) + (silent ? '&event=silent' : '');
      xhr.onreadystatechange = function () {
        if (!(this.readyState === 3 || this.readyState === 4)) return;
        if (this.status !== 200 || this.responseText === 'false') {
          res.error = true;
          res.value = new Error('No remote connected to the server. Use :help command to :listen.');
          return resolve(res);
        }
        res.value = '';
        return resolve(res);
      };
      xhr.open('POST', '/remote/' + remoteId + '/run', true);
      xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');
      xhr.send(params);
    } catch (error) {
      res.error = true;
      res.value = error;
      return resolve(res);
    }
  });
}

