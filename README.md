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

The `graphqlWsSubscriber` can be used for subscriptions.

```js
import { graphqlWsSubscriber } from '@barejs/graphql-client'

const url = 'http://www.example.com/sse-subscription'
const init = {}

const query = 'subscription { someSubscription { someField someOtherField } }'
const variables = null
const operationName = null

graphqlWsSubscriber(
  url,
  init,
  query,
  variables,
  operationName,
  error => console.error(error),
  data => console.log(data))
```

### Queries, Mutations and Subscriptions

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