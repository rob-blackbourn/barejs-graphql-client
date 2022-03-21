# @barejs/graphql-client

This is a collection of GraphQL clients which support queries, mutations and subscriptions.

It specifically targets the 
[bareASGI GraphQL](https://github.com/rob-blackbourn/bareASGI-graphql-next)
module from the
[bareASGI](https://github.com/rob-blackbourn/bareASGI)
python web framework. This framework provides two novel features.

* Server side identification of subscriptions (by returning a 201 if the query was a subscription),
* Multiple subscription transports ([WebSocket](https://developer.mozilla.org/en-US/docs/Web/API/WebSocket), [EventSource (server sent events)](https://developer.mozilla.org/en-US/docs/Web/API/EventSource), and [fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API) with [ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream).

Because the
[ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) api is a feature of
[fetch](https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API),
it can provide headers to the server, allowing CORS and authentication to be maintained. This is a relatively new feature; in particular the
[pipeThrough](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/pipeThrough) and
[pipeTo](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/pipeTo)
methods (which are used by the client) are still marked as "experimental". At the time of writing this is supported by most common browsers with the notable exception of FireFox (and Internet Explorer, obviously).

## Usage

### Queries and mutations

The `graphqlFetchClient` function is a thin wrapper around fetch. It can be
used for queries and mutations.

```js
import { graphqlFetchClient } from '@barejs/graphql-client'

const url = 'http://www.example.com/graphql'
const init {}

const query = 'query { someQuery { someField someOtherField } }'
const variables = null
const operationName = null

graphqlFetchClient(
  url,
  init,
  query,
  variables,
  operationName,
  error => console.error(error),
  data => console.log(data))
```

### Subscriptions

There are three mechanisms provided for subscriptions:

* Over WebSockets (widely supported),
* Using server sent events (only supported by bareASGI)
* Using readable streams (only supported by bareASGI)

#### WebSockets

This follows the [Apollo websocket protocol](https://github.com/apollographql/subscriptions-transport-ws/blob/master/PROTOCOL.md),
which appears to be the most widely used and compatible transport. The main issue with the websocket transport is
that authentication is must be implemented separately, as headers and cookie are not available.

```js
import { graphqlWsSubscriber } from '@barejs/graphql-client'

const url = 'http://www.example.com/sse-subscription'

const query = 'subscription { someSubscription { someField someOtherField } }'
const variables = null
const operationName = null

graphqlWsSubscriber(
  url,
  query,
  variables,
  operationName,
  error => console.error(error),
  data => console.log(data))
```

The maximum number of web sockets is browser dependent, and is in the order of 30
per host, and 256 in total.

#### Server Sent Events

This sends the subscription as JSON messages over and `EventSource`. This is
a widely supported protocol. Under the hood this is implemented as a streaming GET.
This means things like headers are valid, which allows for consistent authentication.

```js
import { graphqlEventSourceSubscriber } from '@barejs/graphql-client'

const url = 'http://www.example.com/sse-subscription'
init = {
  withCredentials: true // This controls CORS behaviour.
}

const query = 'subscription { someSubscription { someField someOtherField } }'
const variables = null
const operationName = null

graphqlEventSourceSubscriber(
  url,
  init,
  query,
  variables,
  operationName,
  error => console.error(error),
  data => console.log(data))
```

Under http/1.1 most browsers allow up to 6 concurrent connections per session. This
is not an issue with http/2 as all http traffic to a host is multiplexed over a
single connection.

#### Readable Streams

Readable streams are essentially a long running fetch. This means they have similar
characteristics to server sent events, without the slightly arcane protocol.

The key advantage to this approach is that it works for `query` and `mutation`
as well as `subscription`. This means everything works from  a single client,
which is attractive.

```js
import { graphqlStreamClient } from '@barejs/graphql-client'

const url = 'http://www.example.com/sse-subscription'
init = {} // Anything the fetch takes.

const query = 'subscription { someSubscription { someField someOtherField } }'
const variables = null
const operationName = null

graphqlStreamClient(
  url,
  init,
  query,
  variables,
  operationName,
  error => console.error(error),
  data => console.log(data))
```

As with server sent events the 6 connection limitation with http/1.1 is an issue.

### Clients

By using one of the three "client" functions, queries, mutations and subscriptions can
be handled transparently. For web sockets and server sent events this is achieved by
the server responding to a subscription with the location of the web socket or SSE
endpoint. For readable streams, no redirection is necessary.

The `graphqlWsClient` can be used for queries, mutations, or subscriptions when using
the 
[bareASGI-graphql-next server](https://github.com/rob-blackbourn/bareasgi-graphql-next)
server, using web sockets as the underlying subscription transport.

```js
import { graphqlWsClient } from '@barejs/graphql-client'

const url = 'http://www.example.com/graphql'
const init = {}

// This could be a query, mutation or subscription.
const query = 'subscription { someSubscription { someField someOtherField } }'
const variables = null
const operationName = null

const unsubscribe = graphqlWsClient(
  url,
  init,
  query,
  variables,
  operationName,
  data => console.log(data),
  error => console.log(error),
  () => console.log('complete'))

// Later ...
unsubscribe()
```

There are three client functions:

* `graphqlWsClient`
* `graphqlEventSourceClient`
* `graphqlStreamClient`

They take the same arguments as `graphqlWsClient`.

#### graphqlWsClient

The `graphqlWsClient` function uses a WebSocket as the subscription transport.
This implements the
[appolo](https://github.com/apollographql/subscriptions-transport-ws/blob/master/PROTOCOL.md)
protocol which is supported by all major GraphQL web servers.

#### graphqlEventSourceClient

The `graphqlEventSourceClient` function uses an `EventSource` as the subscription
transport. It is more efficient than the WebSocket transport, but is only supported
by the 
[bareASGI-graphql-next server](https://github.com/rob-blackbourn/bareasgi-graphql-next)
server. 
The underlying `EventSource` transport requires the subscription query and parameters
to be passed in the url as a query string which can be problematic for large queries.

#### graphqlStreamClient

The `graphqlStreamClient` uses a streaming fetch with `ReadableStreams` as the
subscription transport. This is the most efficient
transport, but is only supported by the
[bareASGI-graphql-next server](https://github.com/rob-blackbourn/bareasgi-graphql-next)
server. The request method is `POST` so large queries are not a problem.

## Installation

```bash
npm install @barejs/graphql-client
```