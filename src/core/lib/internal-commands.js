/*global window EventSource fetch */
import consoleParse from './console-parse';

const version = process.env.REACT_APP_VERSION;
const API = process.env.REACT_APP_API || '';


const welcome = () => ({
  value: `Use <strong>:help</strong> to show remotejsconsole commands
version: ${version}`,
  html: true,
});

const help = () => ({
  value: `:listen [id] - starts remote debugging session
:capture [selector] - capture element in remote session by clicking or providing a selector
:theme dark|light
:clear
:history
:about
:version

${about().value}`,
  html: true,
});

const about = () => ({
  value:
    'Forked from <a href="https://twitter.com/rem" target="_blank">@rem</a> • <a href="https://github.com/remy/remotejsconsole" target="_blank">open source</a> • <a href="https://www.paypal.me/rem/9.99usd" target="_blank">donate</a>',
  html: true,
});

const set = async ({ args: [key, value], app }) => {
  switch (key) {
    case 'theme':
      if (['light', 'dark'].includes(value)) {
        app.props.setTheme(value);
      }
      break;
    case 'layout':
      if (['top', 'bottom'].includes(value)) {
        app.props.setLayout(value);
      }
      break;
    default:
  }
};

const theme = async ({ args: [theme], app }) => {
  if (['light', 'dark'].includes(theme)) {
    app.props.setTheme(theme);
    return;
  }

  return 'Try ":theme dark" or ":theme light"';
};

const history = async ({ app, args: [n = null] }) => {
  const history = app.context.store.getState().history;
  if (n === null) {
    return history.map((item, i) => `${i}: ${item.trim()}`).join('\n');
  }

  // try to re-issue the historical command
  const command = history.find((item, i) => i === n);
  if (command) {
    app.onRun(command);
  }

  return;
};

const capture = async ({ args: [selector], app }) => {
  if (selector) {
    app.onRun(`console.capture("${selector||''}")`, '', true);
  } else {
    app.onRun('console.capture()', '', false);
  }
};

const clear = ({ console }) => {
  console.clear();
};

const listen = async ({ args: [id], console: internalConsole }) => {
  // create new eventsocket
  const res = await fetch(`${API}/remote/${id || ''}`);
  id = await res.json();

  return new Promise(resolve => {
    const sse = new EventSource(`${API}/remote/${id}/log`);

    window.eventSource = {
      sse,
      id
    };

    sse.onopen = () => {
      resolve(
        `Listening to "${id}"\n\nUse either of the follow methods to connect a remote browser:\n\n<script src="${
          window.location.origin
        }/js/remote.js?${id}"></script>\n\njavascript:(function(s){s.src='${window.location.origin}/js/remote.js?${id}';document.body.appendChild(s)})(document.createElement('script'))`
      );
    };

    sse.onmessage = event => {
      const data = JSON.parse(event.data);
      if (data.response) {
        if (data.silent) {
          //console.log(data);
          return;
        }
        if (typeof data.response === 'string') {
          try {
            const parsed = consoleParse(data.response);
            if (parsed instanceof Array) {
              internalConsole.log(...parsed);
            } else {
              internalConsole.log(parsed);
            }
          } catch(e) {
            internalConsole.log(data.response);
          }
          window.app.scrollDown();
          return;
        }
        throw new Error('Bad parsing');
      }
    };

    sse.onclose = function() {
      window.eventSource = null;
      internalConsole.log('Remote connection closed');
    };
  });
};

const commands = {
  help,
  about,
  listen,
  theme,
  clear,
  history,
  set,
  capture,
  welcome,
  version: () => version,
};

export default commands;
