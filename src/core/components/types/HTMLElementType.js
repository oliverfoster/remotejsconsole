import React, { Component } from 'react';
import which from '../../lib/which-type';
import StringType from './StringType';
import zip from 'lodash/zip';
import flatten from 'lodash/flatten';
import ErrorType from './ErrorType';

const LIMIT_CLOSED = 5;

function* enumerate(obj) {
  let visited = new Set();
  while (obj) {
    for (let key of Reflect.ownKeys(obj)) {
      if (typeof key === 'string') {
        let desc = Reflect.getOwnPropertyDescriptor(obj, key);
        if (desc && !visited.has(key)) {
          visited.add(key);
          if (desc.enumerable) {
            yield key;
          }
        }
      }
    }
    obj = Reflect.getPrototypeOf(obj);
  }
}

class HTMLElementType extends Component {
  constructor(props) {
    super(props);
    this.toggle = this.toggle.bind(this);
    this.fetch = this.fetch.bind(this);
    this.fetchChildren = this.fetchChildren.bind(this);
    this.fetchParents = this.fetchParents.bind(this);
    this.fetchDescendents = this.fetchDescendents.bind(this);
    this.fetchCSSRules = this.fetchCSSRules.bind(this);
    this.fetchComputedStyles = this.fetchComputedStyles.bind(this);
    this.fetchSize = this.fetchSize.bind(this);
    this.highlight = this.highlight.bind(this);
    this.unhighlight = this.unhighlight.bind(this);

    this.state = {
      open: props.open,
    };
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (this.state.open !== nextState.open) {
      return true;
    }

    if (this.props.filter === undefined) {
      return false; // this prevents bananas amount of rendering
    }

    if (this.props.filter === nextProps.filter) {
      return false;
    }

    return true;
  }

  toggle(e) {
    if (!this.props.allowOpen) {
      return;
    }
    e.stopPropagation();
    e.preventDefault();
    this.setState({ open: !this.state.open });
  }

  async fetch(e) {
    e.stopPropagation();
    e.preventDefault();
    const {
      value
    } = this.props;
    await this.props.onRun(
      `console.inspect(${value.__remotejsconsole_id});`,
      ''
    );
    this.props.scrollDown(true);
  }

  async fetchChildren(e) {
    e.stopPropagation();
    e.preventDefault();
    const {
      value
    } = this.props;
    await this.props.onRun(
      `console.inspect(${value.__remotejsconsole_id}, "children");`,
      'Children:'
    );
    this.props.scrollDown(true);
  }

  async fetchParents(e) {
    e.stopPropagation();
    e.preventDefault();
    const {
      value
    } = this.props;
    await this.props.onRun(
      `console.inspect(${value.__remotejsconsole_id}, "parents");`,
      'Parents:'
    );
    this.props.scrollDown(true);
  }

  async fetchDescendents(e) {
    e.stopPropagation();
    e.preventDefault();
    const {
      value
    } = this.props;
    await this.props.onRun(
      `console.inspect(${value.__remotejsconsole_id}, "descendents");`,
      'Descendents:'
    );
    this.props.scrollDown(true);
  }

  async fetchCSSRules(e) {
    e.stopPropagation();
    e.preventDefault();
    const {
      value
    } = this.props;
    await this.props.onRun(
      `console.cssRules(${value.__remotejsconsole_id});`,
      'CSS Rules:'
    );
    this.props.scrollDown(true);
  }

  async fetchComputedStyles(e) {
    e.stopPropagation();
    e.preventDefault();
    const {
      value
    } = this.props;
    await this.props.onRun(
      `console.styles(${value.__remotejsconsole_id});`,
      'Computed styles:'
    );
    this.props.scrollDown(true);
  }

  async fetchSize(e) {
    e.stopPropagation();
    e.preventDefault();
    const {
      value
    } = this.props;
    await this.props.onRun(
      `console.size(${value.__remotejsconsole_id});`,
      'Size:'
    );
    this.props.scrollDown(true);
  }

  async highlight() {
    const {
      value
    } = this.props;
    await this.props.onRun(
      `console.highlight(${value.__remotejsconsole_id})`, null, true
    );
  }

  async unhighlight() {
    await this.props.onRun(
      'console.highlight(null)', null, true
    );
  }

  render() {
    const { open } = this.state;
    const {
      filter = null,
      value,
      shallow = true,
      type = {}.toString.call(value),
    } = this.props;
    let { displayName, preview, resolution } = this.props;

    if (!displayName) {
      displayName = value.constructor ? value.constructor.name : 'Object';
    }

    if (!preview) {
      preview = value.__remotejsconsole_preview instanceof Object ? '' : (value.__remotejsconsole_preview || '');
    }

    if (!resolution) {
      resolution = value.__remotejsconsole_resolution instanceof Object ? '' : (value.__remotejsconsole_resolution || '');
    }

    if (!open && shallow) {
      return (
        <div>
          <div onMouseEnter={this.highlight} onMouseLeave={this.unhighlight} className={`type ${displayName}`}>
            <em onClick={this.toggle}>{displayName}</em>
            <em onClick={this.fetch} className="node-preview">{preview}</em>
            <em onClick={this.fetchParents} title="Parents">*&lt;</em>
            <em onClick={this.fetchChildren} title="Children">&gt;</em>
            <em onClick={this.fetchDescendents} title="Descendents">&gt;*</em>
            <em onClick={this.fetchCSSRules} title="CSS Rules">@</em>
            <em onClick={this.fetchComputedStyles} title="Computed styles">#</em>
            <em onClick={this.fetchSize} title="Size">{resolution}</em>
          </div>
        </div>
      );
    }

    let props = open ? [...enumerate(value)] : Object.keys(value);

    Object.getOwnPropertyNames(value).forEach(prop => {
      if (!props.includes(prop)) {
        props.push(prop);
      }
    });

    props = props.filter((prop)=>{
      return prop !== '__remotejsconsole_preview' &&
        prop !== '__remotejsconsole_id' &&
        prop !== '__remotejsconsole_resolution';
    });

    if (filter !== null) {
      props = props.filter(prop => {
        if ((prop + '').toLowerCase().includes(filter)) {
          return true;
        }

        if ((value[prop] + '').toLowerCase().includes(filter)) {
          return true;
        }

        return false;
      });
    }

    if (!open) {
      props.splice(LIMIT_CLOSED);
    }

    let types = props.sort().map((key, i) => {
      let Type = ErrorType;
      let val = null;
      try {
        val = value[key];
        Type = which(val);
      } catch(err) {
        val = err;
      }
      return {
        key,
        value: (
          <Type
            allowOpen={open}
            key={`objectType-${i + 1}`}
            shallow={true}
            value={val}
            onRun={this.props.onRun}
            scrollDown={this.props.scrollDown}
          />
        ),
      };
    });

    if (!open && Object.keys(value).length > LIMIT_CLOSED) {
      types.push(
        <span key="objectType-0" className="more">
          …
        </span>
      );
    }

    if (!open) {
      if (type === 'error') {
        return (
          <div onMouseEnter={this.highlight} onMouseLeave={this.unhighlight} className={`type ${type}`}>
            <em onClick={this.toggle}>{displayName}</em>
            <em onClick={this.fetch} className="node-preview">{preview}</em>
            <em onClick={this.fetchParents} title="Parents">*&lt;</em>
            <em onClick={this.fetchChildren} title="Children">&gt;</em>
            <em onClick={this.fetchDescendents} title="Descendents">&gt;*</em>
            <em onClick={this.fetchCSSRules} title="CSS Rules">@</em>
            <em onClick={this.fetchComputedStyles} title="Computed styles">#</em>
            <em onClick={this.fetchSize} title="Size">{resolution}</em>
            <span>
              {'{'} <StringType value={value.message} /> {'}'}
            </span>
          </div>
        );
      }
      if (displayName !== 'Object') {
        // just show the summary
        return (
          <div onMouseEnter={this.highlight} onMouseLeave={this.unhighlight} className={`type ${type}`}>
            <em onClick={this.toggle}>{displayName}</em>
            <em onClick={this.fetch} className="node-preview">{preview}</em>
            <em onClick={this.fetchParents} title="Parents">*&lt;</em>
            <em onClick={this.fetchChildren} title="Children">&gt;</em>
            <em onClick={this.fetchDescendents} title="Descendents">&gt;*</em>
            <em onClick={this.fetchCSSRules} title="CSS Rules">@</em>
            <em onClick={this.fetchComputedStyles} title="Computed styles">#</em>
            <em onClick={this.fetchSize} title="Size">{resolution}</em>
            <span>{'{ … }'}</span>
          </div>
        );
      }

      // intersperce with commas
      types = flatten(
        zip(
          types,
          Array.from(
            {
              length: types.length - 1,
            },
            (n, i) => {
              return (
                <span key={`sep-${i}`} className="sep">
                  ,
                </span>
              );
            }
          )
        )
      );

      // do mini output
      return (
        <div onMouseEnter={this.highlight} onMouseLeave={this.unhighlight} className="type object closed">
          <em onClick={this.toggle}>{displayName}</em>
          <em onClick={this.fetch} className="node-preview">{preview}</em>
          <em onClick={this.fetchParents} title="Parents">*&lt;</em>
          <em onClick={this.fetchChildren} title="Children">&gt;</em>
          <em onClick={this.fetchDescendents} title="Descendents">&gt;*</em>
          <em onClick={this.fetchCSSRules} title="CSS Rules">@</em>
          <em onClick={this.fetchComputedStyles} title="Computed styles">#</em>
          <em onClick={this.fetchSize} title="Size">{resolution}</em>
          <span>{'{'} </span>
          {types.map((obj, i) => {
            if (obj && obj.key && obj.value) {
              return (
                <span className="object-item key-value" key={`subtype-${i}`}>
                  <span className="key">{obj.key}:</span>
                  <span className="value">{obj.value}</span>
                </span>
              );
            }

            return obj;
          })}
          <span> {'}'}</span>
        </div>
      );
    }

    return (
      <div className={`type ${type} ${open ? '' : 'closed'}`}>
        <div onMouseEnter={this.highlight} onMouseLeave={this.unhighlight} className="header">
          <em onClick={this.toggle}>{displayName}</em>
          <em onClick={this.fetch} className="node-preview">{preview}</em>
          <em onClick={this.fetchParents} title="Parents">*&lt;</em>
          <em onClick={this.fetchChildren} title="Children">&gt;</em>
          <em onClick={this.fetchDescendents} title="Descendents">&gt;*</em>
          <em onClick={this.fetchCSSRules} title="CSS Rules">@</em>
          <em onClick={this.fetchComputedStyles} title="Computed styles">#</em>
          <em onClick={this.fetchSize} title="Size">{resolution}</em>
          <span>{'{'}</span>
        </div>
        <div className="group">
          {types.map((obj, i) => {
            return (
              <div className="object-item key-value" key={`subtype-${i}`}>
                <span className="key">{obj.key}:</span>
                <span className="value">{obj.value}</span>
              </div>
            );
          })}
        </div>
        <span>{'}'}</span>
      </div>
    );
  }
}

export default HTMLElementType;
