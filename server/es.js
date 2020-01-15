class ES {
  constructor(name) {
    this.name = name;
    this.sessions = {};
    this.cache = {};
    this.lastWrite = {};
    this.eventId = 0;

    setInterval(() => {
      Object.keys(this.sessions).forEach(id => this.ping(id));
    }, 5 * 1000);
  }

  add(id, res, xhr = false, isClient) {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    });
    res.write(`eventId: 0\n\n`);
    if (isClient) {
      console.log('adding and sending to client %s', id);
      this.lastWrite[id] = Date.now();
    } else {
      console.log('adding and sending to console %s', id);
    }
    this.sessions[id] = res;
    this.sessions[id].xhr = xhr;
    this.flush(id);
  }

  locals(id) {
    return (this.sessions[id] || { locals: null }).locals;
  }

  flush(id) {
    if (!this.cache[id]) {
      return;
    }
    const res = this.sessions[id];
    if (res && res.connection && res.connection.writable) {
      const message = this.cache[id];
      this.lastWrite[id] = Date.now();
      res.write(message);
      delete this.cache[id];

      if (res.xhr) {
        res.end(); // lets older browsers finish their xhr request
      }
    }
  }

  send(id, body, event) {
    this.eventId++;
    let message = `data: ${body}\neventId:${this.eventId}\nevent:${event}\n\n`;
    const res = this.sessions[id];
    if (res && res.connection && res.connection.writable) {
      res.locals = {
        eventId: this.eventId,
        body,
        id,
        event
      };

      message = (this.cache[id] || '') + message;
      this.lastWrite[id] = Date.now();
      res.write(message);
      delete this.cache[id];

      if (res.xhr) {
        res.end(); // lets older browsers finish their xhr request
      }

    } else {
      if (Date.now() - (this.lastWrite[id] || 0) < 10000) {
        this.cache[id] = this.cache[id] || '';
        this.cache[id] += message;
      } else {
        delete this.cache[id];
      }
      delete this.sessions[id];
    }
  }

  ping(id) {
    const res = this.sessions[id];
    if (res.connection && res.connection.writable) {
      res.write('eventId: 0\n\n');
      this.lastWrite[id] = Date.now();
    } else {
      // remove the res object if it's no longer writable
      delete this.cache[id];
      delete this.sessions[id];
    }
  }
}

module.exports = ES;
