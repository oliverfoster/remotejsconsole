import React, { Component } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';

import Console from './Console';
import Input from '../containers/Input';

import run from '../lib/run';
import internalCommands from '../lib/internal-commands';

// this is lame, but it's a list of key.code that do stuff in the input that we _want_.
const doStuffKeys = /^(Digit|Key|Num|Period|Semi|Comma|Slash|IntlBackslash|Backspace|Delete|Enter)/;

class App extends Component {
  constructor(props) {
    super(props);
    this.onRun = this.onRun.bind(this);
    this.triggerFocus = this.triggerFocus.bind(this);
    this.onUserScroll = this.onUserScroll.bind(this);
    this.scrollDown = this.scrollDown.bind(this);
    window.addEventListener('scroll', this.onUserScroll);
    this.isAtBottom = true;
    window.app = this;
  }

  onUserScroll() {
    const scrollY = window.scrollY;
    const scrollHeight = document.body.scrollHeight - window.innerHeight;
    if (scrollY !== scrollHeight) {
      this.isAtBottom = false;
      return;
    }
    this.isAtBottom = true;
  }

  scrollDown(force) {
    if (!force && !this.isAtBottom) return;
    window.scrollTo(0, document.body.scrollHeight);
  }

  async onRun(command, instruction, silent) {
    const console = this.console;

    const output = instruction !== undefined ? instruction : command;

    if (command[0] !== ':') {
      if (!silent && output) {
        console.push({
          type: 'command',
          command,
          value: output,
        });
      }
      const res = await run(command, silent);
      if ((!res.error && silent) || !res.value) {
        return;
      }
      console.push({
        command,
        type: 'response',
        ...res,
      });
      return;
    }

    let [cmd, ...args] = command.slice(1).split(' ');

    if (/^\d+$/.test(cmd)) {
      args = [parseInt(cmd, 10)];
      cmd = 'history';
    }

    if (!internalCommands[cmd]) {
      console.push({
        command,
        error: true,
        value: new Error(`No such remotejsconsole command "${command}"`),
        type: 'response',
      });
      return;
    }

    let res = await internalCommands[cmd]({ args, console, app: this });

    if (typeof res === 'string') {
      res = { value: res };
    }

    if (res !== undefined) {
      console.push({
        command,
        type: 'log',
        ...res,
      });
    }

    return;
  }

  componentDidMount() {
    const query = decodeURIComponent(window.location.search.substr(1));
    if (query) {
      this.onRun(query);
    } else {
      this.onRun(':welcome');
    }
  }

  triggerFocus(e) {
    if (e.target.nodeName === 'INPUT') return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (e.code && !doStuffKeys.test(e.code)) return;

    this.input.focus();
  }

  render() {
    const { commands = [], theme, layout } = this.props;

    const className = classnames(['App', `theme-${theme}`, layout]);

    return (
      <div
        tabIndex="-1"
        onKeyDown={this.triggerFocus}
        ref={e => (this.app = e)}
        className={className}
      >
        <div className="react-terminal-container">
          <Console
            ref={e => (this.console = e)}
            onRun={this.onRun}
            scrollDown={this.scrollDown}
            commands={commands}
            reverse={layout === 'top'}
          />
          <Input
            inputRef={e => (this.input = e)}
            onRun={this.onRun}
            scrollDown={this.scrollDown}
            autoFocus={window.top === window}
            onClear={() => {
              this.console.clear();
            }}
          />
        </div>
      </div>
    );
  }
}

App.contextTypes = { store: PropTypes.object };

export default App;
