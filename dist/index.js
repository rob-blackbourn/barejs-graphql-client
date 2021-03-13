class FetchError extends Error {
  constructor (response, ...params) {
    super(...params);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FetchError);
    }

    this.name = 'FetchError';
    this.response = response;
  }
}

function graphqlClient (url, init, query, variables, operationName, onNext, onError, onComplete) {
  const abortController = new AbortController();

  // Invoke fetch as a POST with the GraphQL content in the body.
  fetch(url, {
    method: 'POST',
    signal: abortController.signal,
    body: JSON.stringify({
      query,
      variables,
      operationName
    }),
    ...init
  })
    .then(response => {
      if (response.status === 200) {
        // A 200 response is from a query or mutation.

        response.json()
          .then(json => {
            onNext(json);
            onComplete();
          })
          .catch(error => onError(error));
      } else if (response.status === 201) {
        // A 201 is the response for a subscription.

        // The url for the event source is passed in the 'location' header.
        const location = response.headers.get('location');

        const eventSource = new EventSource(location);

        eventSource.onmessage = event => {
          const data = JSON.parse(event.data);
          onNext(data);
        };

        eventSource.onerror = error => {
          onError(error);
        };

        abortController.signal.onabort = () => {
          if (eventSource.readyState !== 2) {
            eventSource.close();
            onComplete();
          }
        };
      } else {
        onError(new FetchError(response, 'Failed to execute GraphQL'));
      }
    })
    .catch(error => onError(error));

  // Return an unsubscribe function.
  return () => {
    abortController.abort();
  }
}

function graphqlEventSourceSubscriber (url, query, variables, operationName, onNext, onError, onComplete) {
  let subscriptionUrl = url + '?query=' + encodeURIComponent(query);
  if (variables) {
    subscriptionUrl += '&variables=' + encodeURIComponent(JSON.stringify(variables));
  }
  if (operationName) {
    subscriptionUrl += '&operationName=' + encodeURIComponent(operationName);
  }

  const eventSource = new EventSource(subscriptionUrl);

  eventSource.onmessage = event => {
    const data = JSON.parse(event.data);
    onNext(data);
  };

  eventSource.onerror = error => {
    onError(error);
  };

  const abortController = new AbortController();
  abortController.signal.onabort = () => {
    if (eventSource.readyState !== 2) {
      eventSource.close();
      onComplete();
    }
  };

  return abortController.abort
}

function graphqlFetchClient (url, init, query, variables, operationName, onError, onSuccess) {
  fetch(url, {
    method: 'POST',
    body: JSON.stringify({
      query,
      variables,
      operationName
    }),
    ...init
  })
    .then(response => {
      if (response.ok) {
        response.json()
          .then(json => {
            onSuccess(json);
          })
          .catch(error => onError(error));
      } else {
        onError(new FetchError(response, 'Failed to execute GraphQL'));
      }
    })
    .catch(error => onError(error));
}

function makeWriteableStream (onNext, onError, onComplete) {
  return new WritableStream({
    write (chunk, controller) {
      onNext(chunk);
    },
    close (controller) {
      onComplete();
    },
    abort (reason) {
      if (reason.name === 'AbortError') {
        onComplete();
      } else {
        onError(reason);
      }
    }
  })
}

function makeLineDecoder () {
  // eslint-disable-next-line no-undef
  return new TransformStream({
    start (controller) {
      controller.buf = '';
      controller.pos = 0;
    },
    transform (chunk, controller) {
      controller.buf += chunk;
      while (controller.pos < controller.buf.length) {
        if (controller.buf[controller.pos] === '\n') {
          const line = controller.buf.substring(0, controller.pos);
          if (line !== '') {
            controller.enqueue(line);
          }
          controller.buf = controller.buf.substring(controller.pos + 1);
          controller.pos = 0;
        } else {
          ++controller.pos;
        }
      }
    },
    flush (controller) {
      if (controller.pos !== 0) {
        controller.enqueue(controller.buf);
      }
    }
  })
}

function graphqlStreamClient (url, init, query, variables, operationName, onNext, onError, onComplete) {
  const body = JSON.stringify({
    query, variables, operationName
  });
  const method = 'POST';
  const abortController = new AbortController();

  fetch(url, {
    method,
    headers: new Headers({
      allow: method,
      'content-type': 'application/json',
      accept: 'application/json',
      ...(init || {}).headers
    }),
    mode: 'cors',
    body,
    signal: abortController.signal,
    ...init
  })
    .then(response => {
      if (response.status === 200) {
        // A streaming response is a subscription.
        const lineDecoder = makeLineDecoder();
        const writeableStream = makeWriteableStream(onNext, onError, onComplete);

        response.body
        // eslint-disable-next-line no-undef
          .pipeThrough(new TextDecoderStream())
          .pipeThrough(lineDecoder)
          // eslint-disable-next-line no-undef
          .pipeThrough(new TransformStream({
            transform (chunk, controller) {
              controller.enqueue(JSON.parse(chunk));
            }
          }))
          .pipeTo(writeableStream)
          .catch(() => {
            // Errors are handled in the writeable stream
          });
      } else {
        onError(new Error('Unhandled response'));
      }
    })
    .catch(error => {
      onError(error);
    });

  // Return a method to stop the request.
  return () => abortController.abort()
}

class GraphQLError extends Error {
  constructor (details, ...params) {
    super(...params);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GraphQLError);
    }

    this.details = details;
  }
}

class EventError extends Error {
  constructor (event, ...params) {
    super(...params);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EventError);
    }

    this.event = event;
  }
}

const GQL = {
  CONNECTION_INIT: 'connection_init',
  CONNECTION_ACK: 'connection_ack',
  CONNECTION_ERROR: 'connection_error',
  CONNECTION_KEEP_ALIVE: 'ka',
  START: 'start',
  STOP: 'stop',
  CONNECTION_TERMINATE: 'connection_terminate',
  DATA: 'data',
  ERROR: 'error',
  COMPLETE: 'complete'
};

class Subscriber {
  constructor (url, options, callback, protocols = 'graphql-ws') {
    this.callback = callback;

    this.nextId = 1;
    this.subscriptions = new Map();
    this.webSocket = new WebSocket(url, protocols);

    this.webSocket.onopen = event => {
      // Initiate the connection
      this.webSocket.send(JSON.stringify({
        type: GQL.CONNECTION_INIT,
        payload: options
      }));
    };

    this.webSocket.onclose = event => {
      // The code 1000 (Normal Closure) is special, and results in no error or payload.
      const error = event.code === 1000 || event.code === 1005 ? null : new EventError(event);
      // Notify the subscriber.
      this.callback(error);
      // Notify the subscriptions.
      const callbacks = Array.from(this.subscriptions.values());
      this.subscriptions.clear();
      for (const callback of callbacks) {
        callback(error, null);
      }
    };

    this.webSocket.onmessage = this.onMessage.bind(this);
  }

  subscribe (query, variables, operationName, callback) {
    const id = (this.nextId++).toString();
    this.subscriptions.set(id, callback);

    this.webSocket.send(JSON.stringify({
      type: GQL.START,
      id,
      payload: { query, variables, operationName }
    }));

    // Return the unsubscriber.
    return () => {
      this.subscriptions.delete(id);

      this.webSocket.send(JSON.stringify({
        type: GQL.STOP,
        id
      }));
    }
  }

  shutdown () {
    this.webSocket.send(JSON.stringify({
      type: GQL.CONNECTION_TERMINATE
    }));
    this.webSocket.close();
  }

  onMessage (event) {
    const data = JSON.parse(event.data);

    switch (data.type) {
      case GQL.CONNECTION_ACK: {
        // This is the successful response to GQL.CONNECTION_INIT
        if (this.callback) {
          this.callback(null, this.subscribe.bind(this));
        }
        break
      }
      case GQL.CONNECTION_ERROR: {
        // This may occur:
        // 1. In response to GQL.CONNECTION_INIT
        // 2. In case of parsing errors in the client which will not disconnect.
        if (this.callback) {
          this.callback(new GraphQLError(data.payload), this);
        }
        break
      }
      case GQL.CONNECTION_KEEP_ALIVE: {
        // This may occur:
        // 1. After GQL.CONNECTION_ACK,
        // 2. Periodically to keep the connection alive.
        break
      }
      case GQL.DATA: {
        // This message is sent after GQL.START to transfer the result of the GraphQL subscription.
        const callback = this.subscriptions.get(data.id);
        if (callback) {
          const error = data.payload.errors ? new GraphQLError(data.payload.errors) : null;
          callback(error, data.payload.data);
        }
        break
      }
      case GQL.ERROR: {
        // This method is sent when a subscription fails. This is usually dues to validation errors
        // as resolver errors are returned in GQL.DATA messages.
        const callback = this.subscriptions.get(data.id);
        if (callback) {
          callback(new GraphQLError(data.payload), null);
        }
        break
      }
      case GQL.COMPLETE: {
        // This is sent when the operation is done and no more dta will be sent.
        const callback = this.subscriptions.get(data.id);
        if (callback) {
          this.subscriptions.delete(data.id);
          // Return a null error and payload to indicate the subscription is closed.
          callback(null, null);
        }
        break
      }
    }
  }
}

function graphqlWsSubscriber (url, query, variables, operationName, onNext, onError, onComplete) {
  let unsubscribe = null;

  const subscriber = new Subscriber(
    url,
    {},
    (error, subscribe) => {
      if (!(error || subscribe)) {
        // Normal closure.
        onComplete();
      } else if (error) {
        onError(error);
      } else {
        unsubscribe = subscribe(
          query,
          variables,
          operationName,
          (errors, data) => {
            if (!(errors || subscribe)) {
              // Normal closure
              onComplete();
            } else {
              onNext({ data, errors });
            }
          });
      }
    },
    'graphql-ws');

  const shutdown = subscriber.shutdown.bind(subscriber);

  return () => {
    if (unsubscribe !== null) {
      unsubscribe();
    }
    shutdown();
  }
}

function graphqlWsClient (url, init, query, variables, operationName, onNext, onError, onComplete) {
  const abortController = new AbortController();

  // Invoke fetch as a POST with the GraphQL content in the body.
  fetch(url, {
    method: 'POST',
    signal: abortController.signal,
    body: JSON.stringify({
      query,
      variables,
      operationName
    }),
    ...init
  })
    .then(response => {
      if (response.status === 200) {
        // A 200 response is from a query or mutation.

        response.json()
          .then(json => {
            onNext(json);
            onComplete();
          })
          .catch(error => onError(error));
      } else if (response.status === 201) {
        // A 201 is the response for a subscription.

        // The url for the event source is passed in the 'location' header.
        const location = response.headers.get('location');
        const index = location.indexOf('?');
        const wsUrl = 'ws' + location.slice(4, index === -1 ? undefined : index);

        const unsubscribe = graphqlWsSubscriber(wsUrl, query, variables, operationName, onNext, onError, onComplete);

        abortController.signal.onabort = () => {
          unsubscribe();
        };
      } else {
        onError(new FetchError(response, 'Failed to execute GraphQL'));
      }
    })
    .catch(error => {
      onError(error);
    });

  // Return an unsubscribe function.
  return () => {
    abortController.abort();
  }
}

export { FetchError, graphqlWsClient as graphqlClient, graphqlClient as graphqlEventSourceClient, graphqlEventSourceSubscriber, graphqlFetchClient, graphqlStreamClient, graphqlWsClient, graphqlWsSubscriber };
