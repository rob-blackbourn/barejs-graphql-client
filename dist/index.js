/**
 * An error which encapsulates an event.
 */
class EventError extends Error {
  /**
   * Create an event error.
   * @param {Event} event - The event that caused the error.
   * @param  {...any} params - Any other error params.
   */
  constructor(event, ...params) {
    super(...params);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, EventError);
    }

    this.event = event;
  }
}

/**
 * An error generated by fetch.
 */
class FetchError extends Error {
  /**
   * Creat a fetch error.
   * @param {Response} response - The fetch response.
   * @param  {...any} params - Any other Error params.
   */
  constructor(response, ...params) {
    super(...params);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, FetchError);
    }

    this.name = 'FetchError';
    this.response = response;
  }
}

/**
 * A GraphQL error.
 */
class GraphQLError extends Error {
  /**
   * Create a GraphQL error.
   * @param {any} details - The error details.
   * @param  {...any} params - Any other Error params.
   */
  constructor(details, ...params) {
    super(...params);

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GraphQLError);
    }

    Object.assign(this, details);
  }
}

function isObject(item) {
  return item && typeof item === 'object' && item.constructor === Object
}

function mergeDeep(target, source) {
  let output = Object.assign({}, target);
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) Object.assign(output, { [key]: source[key] });
        else output[key] = mergeDeep(target[key], source[key]);
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output
}

/**
 * Create a graphQL client that can be used for Query, Mutation and Subscription, using server sent events.
 * @param {string} url - The url to target.
 * @param {Object} init - Extra arguments for fetch.
 * @param {string} query - The query.
 * @param {Object} [variables] - Query variables.
 * @param {string} [operationName] - The name of the operation to invoke.
 * @param {NextValue} onNext - Called when GraphQL provides data.
 * @param {function} onError - Called when an error has occurred.
 * @param {function} onComplete - Called when the operation is complete.
 * @returns {function} - A function that can be called to terminate the operation.
 */
function graphqlEventSourceClient(
  url,
  init,
  query,
  variables,
  operationName,
  onNext,
  onError,
  onComplete
) {
  const abortController = new AbortController();

  init = mergeDeep(
    {
      method: 'POST',
      headers: {
        allow: 'GET',
        'content-type': 'application/json',
        accept: 'application/json'
      },
      signal: abortController.signal,
      body: JSON.stringify({
        query,
        variables,
        operationName
      })
    },
    init
  );

  // Invoke fetch as a POST with the GraphQL content in the body.
  fetch(url, init)
    .then(response => {
      if (response.status === 200) {
        // A 200 response is from a query or mutation.

        response
          .json()
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

/**
 * A GraphQL subscription client using server sen events.
 * @param {string} url - The GraphQL url.
 * @param {string} query - The GraphQL query.
 * @param {Object} [variables] - Any GraphQL variables.
 * @param {string} [operationName] - The name of the operation to invoke,
 * @param {function} onNext - Called when the operation provides data.
 * @param {function} onError - Called when the operation has raised an error.
 * @param {function} onComplete - Called when the operation has completed.
 * @returns {function} - A function which can be called to terminate the operation.
 */
function graphqlEventSourceSubscriber(
  url,
  query,
  variables,
  operationName,
  onNext,
  onError,
  onComplete
) {
  let subscriptionUrl = url + '?query=' + encodeURIComponent(query);
  if (variables) {
    subscriptionUrl +=
      '&variables=' + encodeURIComponent(JSON.stringify(variables));
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

/**
 * A simple fetch-based GraphQL client. This can handle Query and Mutation.
 * @param {string} url - The GraphQL query endpoint.
 * @param {Object} init - Any additional parameters for fetch.
 * @param {string} query - The GraphQL query.
 * @param {Object} [variables] - Any GraphQL variables.
 * @param {string} [operationName] - The name of the operation to invoke.
 * @param {function} onError - The function called when an error has occurred.
 * @param {function} onSuccess - The function called when the query has been successfully invoked.
 * @returns {function} - A function that can be called to terminate the operation.
 */
function graphqlFetchClient(
  url,
  init,
  query,
  variables,
  operationName,
  onError,
  onSuccess
) {
  const abortController = new AbortController();
  init = mergeDeep(
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json'
      },
      body: JSON.stringify({
        query,
        variables,
        operationName
      }),
      signal: abortController.signal
    },
    init
  );

  fetch(url, init)
    .then(response => {
      if (response.ok) {
        response
          .json()
          .then(json => {
            onSuccess(json);
          })
          .catch(error => onError(error));
      } else {
        onError(new FetchError(response, 'Failed to execute GraphQL'));
      }
    })
    .catch(error => onError(error));

  // Return a function to abort the fetch.
  return () => {
    abortController.abort();
  }
}

/* global TransformStream */

function makeWriteableStream(onNext, onError, onComplete) {
  return new WritableStream({
    write(chunk, controller) {
      onNext(chunk);
    },
    close(controller) {
      onComplete();
    },
    abort(reason) {
      if (reason.name === 'AbortError') {
        onComplete();
      } else {
        onError(reason);
      }
    }
  })
}

function makeLineDecoder() {
  // eslint-disable-next-line no-undef
  return new TransformStream({
    start(controller) {
      controller.buf = '';
      controller.pos = 0;
    },
    transform(chunk, controller) {
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
    flush(controller) {
      if (controller.pos !== 0) {
        controller.enqueue(controller.buf);
      }
    }
  })
}

/**
 * A GraphQL client using a streaming fetch. This can support Query, Mutation, and Subscription.
 * @param {string} url - The GraphQL url.
 * @param {Object} init - Additional parameters passed to fetch.
 * @param {string} query - The GraphQL query.
 * @param {Object} [variables] - Any variables required by the query.
 * @param {string} [operationName] - The name of the operation to invoke,
 * @param {function} onNext - The function called when data is provided.
 * @param {function} onError - The function called when an error occurs.
 * @param {function} onComplete - The function called when the operation has completed.
 * @returns {function} - A function that can be called to terminate the operation.
 */
function graphqlStreamClient(
  url,
  init,
  query,
  variables,
  operationName,
  onNext,
  onError,
  onComplete
) {
  const abortController = new AbortController();

  init = mergeDeep(
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json',
        allow: 'POST'
      },
      body: JSON.stringify({
        query,
        variables,
        operationName
      }),
      signal: abortController.signal
    },
    init
  );

  fetch(url, init)
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
          .pipeThrough(
            new TransformStream({
              transform(chunk, controller) {
                controller.enqueue(JSON.parse(chunk));
              }
            })
          )
          .pipeTo(writeableStream)
          .catch(() => {
            // Errors are handled in the writeable stream
          });
      } else {
        onError(new FetchError(response, 'Unhandled response'));
      }
    })
    .catch(error => {
      onError(error);
    });

  // Return a method to stop the request.
  return () => abortController.abort()
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
  constructor(url, options, callback, protocols = 'graphql-ws') {
    this.callback = callback;

    this.nextId = 1;
    this.subscriptions = new Map();
    this.webSocket = new WebSocket(url, protocols);

    this.webSocket.onopen = event => {
      // Initiate the connection
      this.webSocket.send(
        JSON.stringify({
          type: GQL.CONNECTION_INIT,
          payload: options
        })
      );
    };

    this.webSocket.onclose = event => {
      // The code 1000 (Normal Closure) is special, and results in no error or payload.
      const error =
        event.code === 1000 || event.code === 1005
          ? null
          : new EventError(event);

      // Notify this subscriber.
      this.callback(error, null);

      // Notify the subscriptions.
      const callbacks = Array.from(this.subscriptions.values());
      this.subscriptions.clear();
      for (const callback of callbacks) {
        callback(error, null);
      }
    };

    this.webSocket.onmessage = this.onMessage.bind(this);
  }

  subscribe(query, variables, operationName, callback) {
    const id = (this.nextId++).toString();
    this.subscriptions.set(id, callback);

    this.webSocket.send(
      JSON.stringify({
        type: GQL.START,
        id,
        payload: { query, variables, operationName }
      })
    );

    // Return the unsubscriber.
    return () => {
      this.subscriptions.delete(id);

      this.webSocket.send(
        JSON.stringify({
          type: GQL.STOP,
          id
        })
      );
    }
  }

  shutdown() {
    this.webSocket.send(
      JSON.stringify({
        type: GQL.CONNECTION_TERMINATE
      })
    );
    this.webSocket.close();
  }

  onMessage(event) {
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
          const response = {
            data: data.payload.data,
            errors: data.payload.errors
              ? data.payload.errors.map(error => new GraphQLError(error))
              : null
          };
          callback(null, response);
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
      default: {
        console.error(new Error('unhandled state'));
      }
    }
  }
}

/**
 * A GraphQL web socket subscriber.
 * @param {string} url - The GraphQL url.
 * @param {string} query - The GraphQL query.
 * @param {Object} [variables] - Any variables required by the query.
 * @param {string} [operationName] - The name of the operation to invoke,
 * @param {function} onNext - The function called when data is provided.
 * @param {function} onError - The function called when an error occurs.
 * @param {function} onComplete - The function called when the operation has completed.
 * @returns {function} - A function that can be called to terminate the operation.
 */
function graphqlWsSubscriber(
  url,
  query,
  variables,
  operationName,
  onNext,
  onError,
  onComplete
) {
  let unsubscribe = null;

  const subscriber = new Subscriber(
    url,
    {},
    (error, subscribe) => {
      if (error) {
        onError(error);
      } else if (!subscribe) {
        onComplete();
      } else {
        unsubscribe = subscribe(
          query,
          variables,
          operationName,
          (error, response) => {
            if (!subscribe) {
              // Normal closure
              onComplete();
            } else {
              onNext(response);
            }
          }
        );
      }
    },
    'graphql-ws'
  );

  const shutdown = subscriber.shutdown.bind(subscriber);

  return () => {
    if (unsubscribe !== null) {
      unsubscribe();
    }
    shutdown();
  }
}

/**
 * A GraphQL client using web sockets for subscriptions. This can handle Query, Mutation and Subscription.
 * @param {string} url - The GraphQL url.
 * @param {Object} init - Additional parameters passed to fetch.
 * @param {string} query - The GraphQL query.
 * @param {Object} [variables] - Any variables required by the query.
 * @param {string} [operationName] - The name of the operation to invoke,
 * @param {function} onNext - The function called when data is provided.
 * @param {function} onError - The function called when an error occurs.
 * @param {function} onComplete - The function called when the operation has completed.
 * @returns {function} - A function that can be called to terminate the operation.
 */
function graphqlWsClient(
  url,
  init,
  query,
  variables,
  operationName,
  onNext,
  onError,
  onComplete
) {
  const abortController = new AbortController();
  init = mergeDeep(
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        accept: 'application/json'
      },
      body: JSON.stringify({
        query,
        variables,
        operationName
      }),
      signal: abortController.signal
    },
    init
  );

  // Invoke fetch as a POST with the GraphQL content in the body.
  fetch(url, init)
    .then(response => {
      if (response.status === 200) {
        // A 200 response is from a query or mutation.

        response
          .json()
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

        const unsubscribe = graphqlWsSubscriber(
          wsUrl,
          query,
          variables,
          operationName,
          onNext,
          onError,
          onComplete
        );

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

export { EventError, FetchError, GraphQLError, graphqlEventSourceClient, graphqlEventSourceSubscriber, graphqlFetchClient, graphqlStreamClient, graphqlWsClient, graphqlWsSubscriber };
